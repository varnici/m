from __future__ import annotations

import asyncio
import os
from typing import Optional

import httpx
import jwt
from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic_settings import BaseSettings

from rate_limiter import InMemoryRateLimiter
from jwt_validator import JWTValidationError, validate_hs256_jwt


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


def require_auth(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        if settings.env == "dev" and x_user_id:
            return x_user_id
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    try:
        claims = validate_hs256_jwt(token, secret=settings.jwt_secret, issuer=settings.jwt_issuer, audience=settings.jwt_audience)
    except JWTValidationError as e:
        if settings.env == "dev" and x_user_id:
            return x_user_id
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


@app.api_route("/v1/core/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], include_in_schema=False)
async def proxy_core(path: str, request: Request, _sub: str = Depends(require_auth)):
    return await _proxy(request, settings.core_banking_url, f"v1/{path}")


@app.api_route("/v1/inventory", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], include_in_schema=False)
async def proxy_inventory_root(request: Request, _sub: str = Depends(require_auth)):
    return await _proxy(request, settings.core_banking_url, "v1/inventory")


@app.api_route("/v1/inventory/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], include_in_schema=False)
async def proxy_inventory(path: str, request: Request, _sub: str = Depends(require_auth)):
    return await _proxy(request, settings.core_banking_url, f"v1/inventory/{path}")


@app.api_route("/v1/ai/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], include_in_schema=False)
async def proxy_ai(path: str, request: Request, _sub: str = Depends(require_auth)):
    return await _proxy(request, settings.ai_ml_url, f"v1/{path}")


@app.api_route("/v1/rag/{path:path}", methods=["GET", "POST"], include_in_schema=False)
async def proxy_rag(path: str, request: Request, _sub: str = Depends(require_auth)):
    return await _proxy(request, settings.rag_url, f"v1/{path}")


@app.api_route("/v1/ussd/{path:path}", methods=["GET", "POST"], include_in_schema=False)
async def proxy_ussd(path: str, request: Request):
    # USSD callbacks are typically unauthenticated but signed at provider layer.
    return await _proxy(request, settings.ussd_url, f"v1/{path}")


@app.get("/v1/dashboard/{user_id}")
async def get_dashboard_summary(user_id: str, _sub: str = Depends(require_auth)):
    """
    Get complete dashboard summary by orchestrating calls to multiple services.
    Returns aggregated data from core-banking and rag services.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Parallel requests to different services
        tasks = []

        # Core banking dashboard data
        tasks.append(client.get(
            f"{settings.core_banking_url}/v1/dashboard/{user_id}/dashboard",
            headers={"Authorization": f"Bearer {_get_service_token()}"}
        ))

        # Market ticker from RAG service (if available)
        try:
            tasks.append(client.get(
                f"{settings.rag_url}/v1/intelligence/market-ticker",
                headers={"Authorization": f"Bearer {_get_service_token()}"}
            ))
        except:
            tasks.append(None)  # Market ticker is optional

        # Personalized articles from RAG service (if available)
        try:
            tasks.append(client.get(
                f"{settings.rag_url}/v1/intelligence/for-you?user_id={user_id}&limit=3",
                headers={"Authorization": f"Bearer {_get_service_token()}"}
            ))
        except:
            tasks.append(None)  # Articles are optional

        # Execute all requests in parallel
        results = await asyncio.gather(*[task for task in tasks if task is not None], return_exceptions=True)

        # Parse results
        dashboard_data = {}
        market_ticker = []
        intelligence_articles = []

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                continue  # Skip failed requests

            if result.status_code == 200:
                data = result.json()
                if i == 0:  # Core banking data
                    dashboard_data = data
                elif i == 1 and "market-ticker" in str(result.url):  # Market ticker
                    market_ticker = data
                elif i == 2 or "for-you" in str(result.url):  # Intelligence articles
                    intelligence_articles = data

        # Combine all data
        response = {
            **dashboard_data,
            "market_ticker": market_ticker,
            "intelligence": intelligence_articles
        }

        return response


def _get_service_token() -> str:
    """
    Generate a service-to-service JWT token for internal API calls.
    """
    import jwt
    import time

    payload = {
        "sub": "api-gateway",
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "exp": int(time.time()) + 300,  # 5 minutes
        "iat": int(time.time()),
        "service": True
    }

    token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    return token
