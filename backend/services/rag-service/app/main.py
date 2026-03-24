from __future__ import annotations

from fastapi import FastAPI

from app.routes import router
from app.core.config import settings


app = FastAPI(title="VentureRoot RAG Service", version="0.1.0")
app.include_router(router, prefix="/v1")


@app.get("/health")
def health():
    return {"ok": True, "service": "rag-service", "env": settings.env}

