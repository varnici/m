from datetime import datetime, UTC

from app.domain.inventory.entities import InventoryCommand, InventoryMovementType
from app.domain.inventory.in_memory import (
    InMemoryIdempotencyStore,
    InMemoryLedgerRepository,
    InMemoryOutbox,
)
from app.domain.inventory.service import InventoryCommandService


def _service() -> tuple[InventoryCommandService, InMemoryLedgerRepository, InMemoryOutbox]:
    ledger = InMemoryLedgerRepository()
    idem = InMemoryIdempotencyStore()
    outbox = InMemoryOutbox()
    return InventoryCommandService(ledger, idem, outbox), ledger, outbox


def test_purchase_records_positive_ledger_entry() -> None:
    service, ledger, outbox = _service()
    command = InventoryCommand(
        owner_id="owner-1",
        command_id="cmd-1",
        idempotency_key="idem-1",
        product_id="product-1",
        movement_type=InventoryMovementType.PURCHASE,
        quantity=10,
        to_store_id="store-1",
        occurred_at=datetime.now(UTC),
    )
    service.process(command)

    assert len(ledger.entries) == 1
    assert ledger.current_quantity("owner-1", "product-1", "store-1") == 10
    assert len(outbox.events) == 1


def test_idempotency_prevents_duplicate_processing() -> None:
    service, ledger, _ = _service()
    command = InventoryCommand(
        owner_id="owner-1",
        command_id="cmd-1",
        idempotency_key="idem-1",
        product_id="product-1",
        movement_type=InventoryMovementType.PURCHASE,
        quantity=5,
        to_store_id="store-1",
        occurred_at=datetime.now(UTC),
    )

    service.process(command)
    service.process(command)

    assert len(ledger.entries) == 1
    assert ledger.current_quantity("owner-1", "product-1", "store-1") == 5


def test_sale_fails_when_stock_is_insufficient() -> None:
    service, _, _ = _service()
    command = InventoryCommand(
        owner_id="owner-1",
        command_id="cmd-sale-1",
        idempotency_key="idem-sale-1",
        product_id="product-1",
        movement_type=InventoryMovementType.SALE,
        quantity=2,
        from_store_id="store-1",
        occurred_at=datetime.now(UTC),
    )

    raised = False
    try:
        service.process(command)
    except ValueError:
        raised = True

    assert raised is True

