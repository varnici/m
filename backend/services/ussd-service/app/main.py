from __future__ import annotations

from fastapi import FastAPI

from app.handlers.menu_handler import router as menu_router
from app.core.config import settings


app = FastAPI(title="VentureRoot USSD Service", version="0.1.0")
app.include_router(menu_router, prefix="/v1")


@app.get("/health")
def health():
    return {"ok": True, "service": "ussd-service", "env": settings.env}

