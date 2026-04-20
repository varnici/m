# Inventory Global Backlog

Date: 2026-04-20
Source: INVENTORY_GLOBAL_ARCHITECTURE_BLUEPRINT.md

## Milestone M1: Domain Foundation

Status: Completed (2026-04-20)
Target: 1 sprint

Tasks:
1. Create `app/domain/inventory` package with entities, events, and ports.
2. Add application service facade for stock commands (`adjust`, `purchase`, `sale`, `transfer`, `transform`).
3. Add idempotency port and in-memory implementation for local verification.
4. Wire a thin adapter from existing `inventory_service_v2` to domain service.

Done criteria:
- domain package exists and imports cleanly
- at least one command path runs through domain service
- idempotency behavior test exists

## Milestone M2: Canonical Ledger

Status: In progress (2026-04-20)
Target: 1-2 sprints

Tasks:
1. Add migration for `inventory_ledger_entries`.
2. Add repository adapter with append-only semantics.
3. Add projection updater for `stock_levels_current`.
4. Implement reconciliation command to compare projection vs ledger.

Done criteria:
- all new stock writes append ledger entries
- projection stays within defined drift threshold

## Milestone M3: Reservation and ATP

Status: In progress (2026-04-20)
Target: 1 sprint

Tasks:
1. Add `inventory_reservations` model and repository.
2. Implement reserve/release/commit APIs.
3. Enforce reservation before sale commit in sales flow.

Done criteria:
- oversell prevention enforced by invariant tests

## Milestone M4: Outbox and Eventing

Status: In progress (started 2026-04-20)
Target: 1 sprint

Tasks:
1. Add transactional outbox table and publisher worker.
2. Emit domain events for all stock-affecting commands.
3. Add dead-letter and replay command.

Done criteria:
- event delivery is at-least-once with idempotent consumers

## Milestone M5: Operations and Compliance

Status: Planned
Target: 1 sprint

Tasks:
1. Define SLOs and telemetry dashboards.
2. Add adjustment reason-code catalog and enforcement.
3. Add audit export and retention policies.

Done criteria:
- compliance and observability checks pass in staging

## Latest Delivery Snapshot (2026-04-20)

Completed this cycle:
1. Added reservation persistence and migration (`inventory_reservations`).
2. Added reservation APIs: reserve, list, get, release, commit.
3. Added outbox processing service (`process pending`, `replay dead-letter`) and task runner (`app/tasks/outbox_publisher.py`).
4. Exposed outbox APIs:
   - `GET /v1/inventory/events/outbox`
   - `POST /v1/inventory/events/outbox/process`
   - `POST /v1/inventory/events/outbox/replay`
5. Fixed route ordering bug so `/stock/reservations` and `/stock/movements` are not shadowed by `/stock/{store_id}`.

Remaining priority items:
1. Enforce reservation-first flow in `create_sales_transaction`.
2. Add reconciliation command for ledger vs stock projection drift.
3. Add invariant/contract tests for reservation and outbox processing.
