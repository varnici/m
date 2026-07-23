from __future__ import annotations

import os

import sentry_sdk
from fastapi import FastAPI

from app.handlers.menu_handler import router as menu_router
from app.core.config import settings

if os.getenv("SENTRY_DSN"):
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        environment=settings.env,
        traces_sample_rate=0.1,
    )

app = FastAPI(title="VentureRoot USSD Service", version="0.1.0")
app.include_router(menu_router, prefix="/v1")


@app.get("/health")
def health():
    return {"ok": True, "service": "ussd-service", "env": settings.env}

