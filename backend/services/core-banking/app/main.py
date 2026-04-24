from __future__ import annotations

from fastapi import FastAPI

from app.api.v1.api import api_router
from app.core.config import settings
from app.infrastructure.database import init_db


from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="VentureRoot Core Banking", version="0.1.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/v1")


from apscheduler.schedulers.background import BackgroundScheduler
from app.tasks.daily_inventory_rollup import run_daily_inventory_rollup

@app.on_event("startup")
def _startup() -> None:
    init_db()
    
    # Start the background scheduler for scheduled tasks
    scheduler = BackgroundScheduler()
    # Run the daily inventory rollup at 00:30 every day
    scheduler.add_job(run_daily_inventory_rollup, 'cron', hour=0, minute=30)
    scheduler.start()
    
    # Optional: Run immediately on startup for testing if needed
    # scheduler.add_job(run_daily_inventory_rollup, 'date')


@app.get("/health")
def health():
    return {"ok": True, "service": "core-banking", "env": settings.env}

