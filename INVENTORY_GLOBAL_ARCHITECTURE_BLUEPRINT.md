# VentureRoot Inventory Global Architecture Blueprint

Date: 2026-04-20
Scope: Core-Banking inventory subsystem and adjacent integrations
Status: Approved target state for phased delivery

## 1. Goal

Build an inventory platform that meets global production standards for:
- correctness (no silent stock drift)
- auditability (who changed what and why)
- reliability (idempotent and recoverable flows)
- scalability (high write throughput and fast analytics)
- extensibility (new channels, warehouses, and compliance rules)

## 2. Current State Summary

Current implementation is a strong MVP, but has architectural constraints:
- movement and stock-level concerns are mixed in service methods
- write model is mutable-first, not ledger-first
- reservation and allocation are not explicit domain concepts
- integration workflows are synchronous and tightly coupled
- event publication and idempotency are partial
- analytics are partly query-time computed, not fully projection-driven

## 3. Target Architecture (North Star)

Use a modular monolith first, with event-driven boundaries ready for service extraction.

Bounded contexts:
- `catalog`: products, units, variants, barcodes
- `inventory_ledger`: immutable stock movements and valuation basis
- `reservations`: hold/release/commit inventory for downstream flows
- `procurement`: purchase orders, receiving, discrepancies
- `fulfillment`: sales depletion, returns, transfers, transformations
- `analytics`: read models and KPI projections

Core architectural rules:
- all stock-affecting writes append to an immutable ledger table
- current stock is a projection from ledger plus reservations
- every write endpoint accepts and enforces idempotency keys
- side effects publish durable domain events via outbox pattern
- read models are asynchronously updated and re-buildable

## 4. Canonical Data Model

Canonical write tables:
- `inventory_ledger_entries`
- `inventory_reservations`
- `inventory_idempotency_keys`
- `domain_outbox`

Projection tables:
- `stock_levels_current`
- `inventory_snapshots_daily`
- `product_velocity_metrics`
- `reorder_recommendations`

Key invariants:
- no ledger entry deletion or in-place mutation
- one idempotency key maps to one logical command result
- quantity deltas are signed and typed (`in`, `out`, `reserve`, `release`, `adjust`)
- reservations never exceed available quantity

## 5. Domain Workflows

Sales flow:
1. reserve stock
2. commit sale (ledger append)
3. release reservation remainder
4. emit `InventoryDepleted` event

Procurement receive flow:
1. receive against PO line
2. append ledger `in` entry
3. update discrepancy status
4. emit `StockReceived` event

Transfer flow:
1. append source `out` entry
2. append destination `in` entry
3. enforce same command id for atomic traceability

Transformation flow:
1. append parent `out`
2. append child `in`
3. keep conversion metadata for audit

## 6. API and Contract Standards

API requirements:
- versioned APIs (`/v1` now, compatibility windows for `/v2`)
- JSON body for mutating commands
- explicit `command_id` and `idempotency_key` support
- machine-readable error codes and human-readable messages

Command contract example fields:
- `idempotency_key`
- `command_id`
- `occurred_at`
- `actor_id`
- `reason_code`

## 7. Security and Compliance Baseline

- tenant isolation at data and service layers
- immutable audit trails for stock-affecting actions
- signed actor context (`X-User-Id` now, token-backed actor claims next)
- reason-code catalog for regulated adjustments
- retention and reconciliation policies

## 8. Reliability and Operations

Reliability patterns:
- transactional outbox for all integration events
- idempotency store with bounded TTL and replay checks
- reconciliation jobs comparing projections vs ledger source
- dead-letter queue handling for failed projection consumers

Operational standards:
- SLOs for write latency, projection freshness, reconciliation drift
- structured logs with `tenant_id`, `command_id`, `idempotency_key`
- metrics: stock drift count, duplicate command count, replay lag

## 9. Performance Strategy

- append-only ledger partitioning by date and tenant
- projection tables indexed for dashboard read paths
- async projection workers and incremental rebuild support
- cache only read models, never canonical write state

## 10. Testing Standard

Required test layers:
- unit tests for domain invariants
- contract tests for API schemas and error codes
- concurrency tests for duplicate commands
- property tests for reservation/availability math
- failure-injection tests for outbox and projection workers
- reconciliation tests for rebuild determinism

## 11. Phased Delivery Plan

Phase 0: Stabilization (done/in-progress)
- resolve API contract mismatches
- normalize error propagation
- align schema/query columns

Phase 1: Domain Foundation
- add domain package and ports
- introduce idempotency abstraction
- start ledger command service

Phase 2: Ledger Migration
- create canonical ledger tables
- route stock mutations through ledger service
- derive stock projections from ledger

Phase 3: Reservation and Allocation
- implement reserve/release/commit APIs
- enforce availability checks before sale commit

Phase 4: Event and Projection Backbone
- transactional outbox
- async projection workers
- reconciliation and replay tooling

Phase 5: Scale and Governance
- partitioning, SLO monitoring, compliance controls
- formal data contracts with dependent services

## 12. Codebase Mapping (Current -> Target)

Current touchpoints:
- `backend/services/core-banking/app/services/inventory_service_v2.py`
- `backend/services/core-banking/app/api/v1/endpoints/inventory.py`
- `backend/services/core-banking/app/services/analytics_service.py`
- `frontend/src/services/inventoryService.ts`

Target module home:
- `backend/services/core-banking/app/domain/inventory/`

Migration rule:
- keep API compatibility while moving internals behind domain ports
- do not break existing mobile clients during phase transitions

## 13. Immediate Start (This Sprint)

1. Create domain package and interfaces for ledger, reservation, outbox, idempotency.
2. Add command-level idempotency checks to stock-affecting endpoints.
3. Introduce a first `record_ledger_entry` path and dual-write validation.
4. Add architecture tests for idempotency and invariant checks.

