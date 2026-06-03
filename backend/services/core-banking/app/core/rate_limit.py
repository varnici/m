from slowapi import Limiter
from slowapi.util import get_remote_address

# Global rate limiter instance
# Uses remote address as the key by default
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)
