from __future__ import annotations

import os

import sentry_sdk
from fastapi import FastAPI

from app.routes import router
from app.core.config import settings

if os.getenv("SENTRY_DSN"):
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        environment=settings.env,
        traces_sample_rate=0.1,
    )

app = FastAPI(
    title="VentureRoot RAG Service",
    version="1.0.0",
    description="Multimodal, index-based, and graph-augmented RAG service for business assistance.",
)
app.include_router(router, prefix="/v1")


@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "rag-service",
        "env": settings.env,
        "embedding_provider": settings.embedding_provider,
        "vector_store": settings.vector_store,
        "llm": "openai" if settings.openai_api_key else "local-grounded",
    }
