from __future__ import annotations

import os
from typing import Optional

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic_settings import BaseSettings

from rate_limiter import InMemoryRateLimiter
from jwt_validdator import JWTValidationError, validate_hs256_jwt


class Settings(BaseSettings):
    env: str = "dev"
    log_level: str = "info"

    jwt_issuer: str = "ventureroot"
    jwt_audience: str = "ventureroot-mobile"
    jwt_secret: str = "dev-secret-change-me"

    core_banking_url: str = "http://core-banking:8001"
    ai_ml_url: str = "http://ai-ml-service:8002"
    rag_url: str = "http://rag-service:8003"
    ussd_url: str = "http://ussd-service:8004"

    class Config:
        env_prefix = ""
        case_sensitive = False


settings = Settings()
app = FastAPI(title="VentureRoot API Gateway", version="0.1.0")
rl = InMemoryRateLimiter(capacity=120, refill_per_sec=2.0)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def require_auth(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    try:
        claims = validate_hs256_jwt(token, secret=settings.jwt_secret, issuer=settings.jwt_issuer, audience=settings.jwt_audience)
    except JWTValidationError as e:
        raise HTTPException(status_code=401, detail=str(e))
    return claims.sub


@app.get("/health")
def health():
    return {"ok": True, "service": "api-gateway", "env": settings.env}


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    key = _client_ip(request)
    if not rl.allow(key):
        return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})
    return await call_next(request)


async def _proxy(request: Request, upstream_base: str, path: str) -> Response:
    url = upstream_base.rstrip("/") + "/" + path.lstrip("/")
    async with httpx.AsyncClient(timeout=30.0) as client:
        upstream = await client.request(
            method=request.method,
            url=url,
            headers={k: v for k, v in request.headers.items() if k.lower() not in {"host", "content-length"}},
            params=request.query_params,
            content=await request.body(),
        )
    return Response(content=upstream.content, status_code=upstream.status_code, headers=dict(upstream.headers))


@app.api_route("/v1/core/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_core(path: str, request: Request, _sub: str = Depends(require_auth)):
    return await _proxy(request, settings.core_banking_url, f"v1/{path}")


@app.api_route("/v1/ai/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_ai(path: str, request: Request, _sub: str = Depends(require_auth)):
    return await _proxy(request, settings.ai_ml_url, f"v1/{path}")


@app.api_route("/v1/rag/{path:path}", methods=["GET", "POST"])
async def proxy_rag(path: str, request: Request, _sub: str = Depends(require_auth)):
    return await _proxy(request, settings.rag_url, f"v1/{path}")


@app.api_route("/v1/ussd/{path:path}", methods=["GET", "POST"])
async def proxy_ussd(path: str, request: Request):
    # USSD callbacks are typically unauthenticated but signed at provider layer.
    return await _proxy(request, settings.ussd_url, f"v1/{path}")

