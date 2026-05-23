from __future__ import annotations

from uuid import uuid4

from fastapi import FastAPI
from starlette.requests import Request

from app.api.v1.api import api_router
from app.core.config import settings
from app.infrastructure.database import init_db
from app.core.rate_limit import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware


from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="VentureRoot Core Banking", version="0.1.0", debug=True)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

allow_credentials = settings.cors_allow_credentials and "*" not in settings.cors_origins

# Add CORS middleware with explicit origin whitelist
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/v1")


@app.middleware("http")
async def attach_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


from apscheduler.schedulers.background import BackgroundScheduler
from app.tasks.daily_inventory_rollup import run_daily_inventory_rollup
from app.tasks.savings_tasks import run_auto_sweep_process

@app.on_event("startup")
def _startup() -> None:
    init_db()
    
    # Start the background scheduler for scheduled tasks
    scheduler = BackgroundScheduler()
    # Run the daily inventory rollup at 00:30 every day
    scheduler.add_job(run_daily_inventory_rollup, 'cron', hour=0, minute=30)
    # Run the savings auto-sweep at 08:00 every day
    scheduler.add_job(run_auto_sweep_process, 'cron', hour=8, minute=0)
    scheduler.start()
    
    # Optional: Run immediately on startup for testing if needed
    # scheduler.add_job(run_daily_inventory_rollup, 'date')


@app.get("/health")
def health():
    return {"ok": True, "service": "core-banking", "env": settings.env}

