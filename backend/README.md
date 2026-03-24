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

