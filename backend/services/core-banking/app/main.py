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


@app.on_event("startup")
def _startup() -> None:
    init_db()


@app.get("/health")
def health():
    return {"ok": True, "service": "core-banking", "env": settings.env}

