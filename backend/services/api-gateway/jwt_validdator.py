from __future__ import annotations

# Backward-compatible alias. New code should import from jwt_validator.
from jwt_validator import JWTClaims, JWTValidationError, validate_hs256_jwt

__all__ = ["JWTClaims", "JWTValidationError", "validate_hs256_jwt"]
