"""Security middleware - CORS, rate limiting, security headers."""
from fastapi import FastAPI, Request, Response
from uuid import UUID
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.config import get_settings

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])


def register_middleware(app: FastAPI) -> None:
    """Register all security middleware."""
    s = get_settings()

    # ── CORS ────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=s.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    # ── Rate limiting ────────────────────────────────────────
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # ── Security headers ─────────────────────────────────────
    @app.middleware("http")
    async def add_security_headers(request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains"
        )
        response.headers["Referrer-Policy"] = "no-referrer"
        if s.is_production:
            response.headers["Cache-Control"] = "no-store"
        return response


def get_current_user(request: Request) -> UUID:
    """Resolve user UUID from trusted edge headers."""
    user_id = request.headers.get("X-User-Id") or request.headers.get("X-UserID")
    if not user_id:
        # Development fallback; production gateways should always inject user identity.
        return UUID("00000000-0000-0000-0000-000000000001")
    return UUID(user_id)
