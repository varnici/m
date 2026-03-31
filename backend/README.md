# VentureRoot Backend (Blueprint Scaffold)

This `backend/` directory is generated from `documentation.md` and provides runnable scaffolding for:

- `services/api-gateway`: auth validation + rate limiting (FastAPI)
- `services/core-banking`: loans, sales, users, risk (FastAPI + Postgres + Redis)
- `services/ai-ml-service`: risk scoring + simple ML endpoints (FastAPI)
- `services/rag-service`: AI assistant retrieval stub (FastAPI)
- `services/ussd-service`: USSD webhook handlers (FastAPI)
- `services/notification-service`: notifications (Django + Celery) **scaffold**
- `services/admin-service`: admin portal (Django) **scaffold**

## Local dev (recommended)

1. Copy env file:

```bash
cp backend/.env.example backend/.env
```

2. Start:

```bash
docker-compose -f backend/docker-compose.yml up --build
```

3. Health checks:

- API Gateway: `http://localhost:8080/health`
- Core Banking: `http://localhost:8081/health`
- AI/ML: `http://localhost:8082/health`
- RAG: `http://localhost:8083/health`
- USSD: `http://localhost:8084/health`

## Notes

- This is a **starter** implementation: endpoints exist, models exist, but integrations (KYC providers, payment rails, Kafka, Vault, Keycloak) are stubbed so you can wire real providers later.
- The mobile app in `mapvo-project/` can be pointed at the API Gateway once you define an API client there.

## Core-Banking API Additions

The `core-banking` service now includes marketplace and artisan modules under `/v1`:

- Marketplace:
  - `POST /v1/marketplace/products?owner_id=<user_id>`
  - `GET /v1/marketplace/products?owner_id=<user_id>`
  - `POST /v1/marketplace/listings`
  - `GET /v1/marketplace/listings/nearby?estate=<estate>|city=<city>`
  - `GET /v1/marketplace/shopfront/{slug}`
- Artisans:
  - `POST /v1/artisans`
  - `GET /v1/artisans?trade_category=<category>&estate=<estate>`
  - `POST /v1/artisans/bookings`
  - `GET /v1/artisans/bookings?client_user_id=<user_id>`
  - `POST /v1/artisans/ratings`
- Transport (Nigeria categories):
  - Vehicle categories are fixed to: `motorcycle`, `car`, `bus`, `truck`
  - `POST /v1/transport/drivers`
  - `GET /v1/transport/drivers/{user_id}`
  - `POST /v1/transport/drivers/{user_id}/activate`
  - `POST /v1/transport/bookings`
  - `GET /v1/transport/bookings/{booking_id}`
  - `POST /v1/transport/bookings/{booking_id}/assign`
  - `POST /v1/transport/bookings/{booking_id}/tracking?driver_user_id=<driver_user_id>`
  - `GET /v1/transport/bookings/{booking_id}/tracking`

## Migration Baseline

`core-banking` Alembic revisions:

- `0001_init` base tables (users, wallets, sales, loans, repayments)
- `0002_marketplace_artisans` marketplace + artisan tables
- `0003_transport_profiles_bookings` driver profiles + transport bookings + tracking points

Run migrations (from `backend/services/core-banking`):

```bash
alembic upgrade head
```

