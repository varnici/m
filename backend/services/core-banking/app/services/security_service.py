"""
Security Service - Production-Grade Hashing & Verification
Uses Argon2 for password/PIN hashing to resist GPU-based brute-force attacks.
"""

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
import logging

logger = logging.getLogger(__name__)

class SecurityService:
    def __init__(self):
        self.ph = PasswordHasher(
            time_cost=3,      # Number of iterations
            memory_cost=65536, # 64MiB
            parallelism=4,     # Number of threads
            hash_len=32,       # Length of hash
            salt_len=16        # Length of salt
        )

    def hash_secret(self, secret: str) -> str:
        """Hash a secret (PIN, Pattern, or Password)."""
        return self.ph.hash(secret)

    def verify_secret(self, hashed_secret: str, secret: str) -> bool:
        """Verify a secret against its hash."""
        try:
            return self.ph.verify(hashed_secret, secret)
        except VerifyMismatchError:
            return False
        except Exception as e:
            logger.error(f"Secret verification error: {str(e)}")
            return False

    def needs_rehash(self, hashed_secret: str) -> bool:
        """Check if a hash needs to be updated for stronger parameters."""
        return self.ph.check_needs_rehash(hashed_secret)

security_service = SecurityService()
