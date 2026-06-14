from __future__ import annotations

import base64
import hashlib
import hmac
import json
from dataclasses import dataclass
from typing import Any, Optional


class JWTValidationError(Exception):
    pass


def _b64url_decode(s: str) -> bytes:
    padding = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode((s + padding).encode("utf-8"))


def _b64url_encode(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode("utf-8").rstrip("=")


@dataclass(frozen=True)
class JWTClaims:
    sub: str
    iss: Optional[str] = None
    aud: Optional[str] = None
    exp: Optional[int] = None
    roles: tuple[str, ...] = ()


def validate_hs256_jwt(token: str, *, secret: str, issuer: str | None = None, audience: str | None = None) -> JWTClaims:
    """
    Minimal HS256 JWT validator (dev-friendly).
    For production: replace with Keycloak/JWKS validation.
    """
    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
    except ValueError as e:
        raise JWTValidationError("Malformed JWT") from e

    try:
        header = json.loads(_b64url_decode(header_b64))
        payload: dict[str, Any] = json.loads(_b64url_decode(payload_b64))
    except (json.JSONDecodeError, UnicodeDecodeError, ValueError) as e:
        raise JWTValidationError("Malformed JWT payload") from e

    if header.get("alg") != "HS256":
        raise JWTValidationError("Unsupported alg")

    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    expected_sig = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    if not hmac.compare_digest(_b64url_encode(expected_sig), signature_b64):
        raise JWTValidationError("Bad signature")

    if issuer and payload.get("iss") != issuer:
        raise JWTValidationError("Bad issuer")
    if audience and payload.get("aud") != audience:
        raise JWTValidationError("Bad audience")

    sub = payload.get("sub")
    if not sub:
        raise JWTValidationError("Missing sub")

    roles = payload.get("roles") or payload.get("role") or []
    if isinstance(roles, str):
        roles = [roles]
    return JWTClaims(sub=str(sub), iss=payload.get("iss"), aud=payload.get("aud"), exp=payload.get("exp"), roles=tuple(map(str, roles)))

