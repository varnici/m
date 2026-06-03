from __future__ import annotations

from dataclasses import replace

from app.domain.inventory.entities import (
    InventoryCommand,
    InventoryLedgerEntry,
    InventoryMovementType,
)
from app.domain.inventory.events import StockAdjusted, StockMovedIn, StockMovedOut
from app.domain.inventory.ports import (
    InventoryIdempotencyStore,
    InventoryLedgerRepository,
    InventoryOutbox,
)


class InventoryCommandService:
    """
    Ledger-first inventory command service.
    This service enforces idempotency and stock invariants before persisting.
    """

    def __init__(
        self,
        ledger_repo: InventoryLedgerRepository,
        idempotency_store: InventoryIdempotencyStore,
        outbox: InventoryOutbox,
    ) -> None:
        self.ledger_repo = ledger_repo
        self.idempotency_store = idempotency_store
        self.outbox = outbox

    def process(self, command: InventoryCommand) -> None:
        if self.idempotency_store.seen(command.owner_id, command.idempotency_key):
            return

        entries = self._to_ledger_entries(command)
        for entry in entries:
            self._validate_invariant(entry)
            self.ledger_repo.append_entry(entry)
            self._emit_event(entry)

        self.idempotency_store.mark(
            owner_id=command.owner_id,
            idempotency_key=command.idempotency_key,
            command_id=command.command_id,
        )

    def _to_ledger_entries(self, command: InventoryCommand) -> list[InventoryLedgerEntry]:
        if command.quantity <= 0:
            raise ValueError("Quantity must be greater than zero.")

        movement = command.movement_type
        if movement in (InventoryMovementType.PURCHASE, InventoryMovementType.RETURN):
            if not command.to_store_id:
                raise ValueError("to_store_id is required for inbound movement.")
            return [self._build_entry(command, command.to_store_id, command.quantity)]

        if movement in (InventoryMovementType.SALE, InventoryMovementType.DAMAGE):
            if not command.from_store_id:
                raise ValueError("from_store_id is required for outbound movement.")
            return [self._build_entry(command, command.from_store_id, -command.quantity)]

        if movement == InventoryMovementType.ADJUSTMENT:
            target_store_id = command.to_store_id or command.from_store_id
            if not target_store_id:
                raise ValueError("store_id is required for adjustment movement.")
            return [self._build_entry(command, target_store_id, command.quantity)]

        if movement == InventoryMovementType.TRANSFER:
            if not command.from_store_id or not command.to_store_id:
                raise ValueError("from_store_id and to_store_id are required for transfer movement.")
            outbound = self._build_entry(command, command.from_store_id, -command.quantity)
            inbound = replace(outbound, store_id=command.to_store_id, quantity_delta=command.quantity)
            return [outbound, inbound]

        raise ValueError(f"Unsupported movement type: {movement}")

    def _build_entry(
        self,
        command: InventoryCommand,
        store_id: str,
        quantity_delta: int,
    ) -> InventoryLedgerEntry:
        return InventoryLedgerEntry(
            owner_id=command.owner_id,
            command_id=command.command_id,
            product_id=command.product_id,
            store_id=store_id,
            quantity_delta=quantity_delta,
            movement_type=command.movement_type,
            occurred_at=command.occurred_at,
            idempotency_key=command.idempotency_key,
            reason_code=command.reason_code,
            reference_id=command.reference_id,
            reference_type=command.reference_type,
        )

    def _validate_invariant(self, entry: InventoryLedgerEntry) -> None:
        if entry.quantity_delta >= 0:
            return
        available = self.ledger_repo.current_quantity(
            owner_id=entry.owner_id,
            product_id=entry.product_id,
            store_id=entry.store_id,
        )
        if available + entry.quantity_delta < 0:
            raise ValueError("Insufficient stock for movement.")

    def _emit_event(self, entry: InventoryLedgerEntry) -> None:
        if entry.quantity_delta > 0:
            event = StockMovedIn(
                owner_id=entry.owner_id,
                command_id=entry.command_id,
                product_id=entry.product_id,
                store_id=entry.store_id,
                occurred_at=entry.occurred_at,
                quantity=entry.quantity_delta,
            )
        elif entry.quantity_delta < 0:
            event = StockMovedOut(
                owner_id=entry.owner_id,
                command_id=entry.command_id,
                product_id=entry.product_id,
                store_id=entry.store_id,
                occurred_at=entry.occurred_at,
                quantity=abs(entry.quantity_delta),
            )
        else:
            event = StockAdjusted(
                owner_id=entry.owner_id,
                command_id=entry.command_id,
                product_id=entry.product_id,
                store_id=entry.store_id,
                occurred_at=entry.occurred_at,
                quantity_delta=entry.quantity_delta,
            )

        self.outbox.publish(event)

