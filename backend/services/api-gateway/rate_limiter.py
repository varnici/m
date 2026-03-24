from __future__ import annotations

import time
from dataclasses import dataclass


@dataclass
class TokenBucket:
    capacity: int
    refill_per_sec: float
    tokens: float
    last_refill: float

    def allow(self, cost: float = 1.0) -> bool:
        now = time.time()
        elapsed = max(0.0, now - self.last_refill)
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_per_sec)
        self.last_refill = now
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False


class InMemoryRateLimiter:
    """
    Dev-only in-memory rate limiter.
    For production: use Redis + sliding window.
    """

    def __init__(self, *, capacity: int = 60, refill_per_sec: float = 1.0) -> None:
        self.capacity = capacity
        self.refill_per_sec = refill_per_sec
        self._buckets: dict[str, TokenBucket] = {}

    def allow(self, key: str) -> bool:
        bucket = self._buckets.get(key)
        if bucket is None:
            bucket = TokenBucket(capacity=self.capacity, refill_per_sec=self.refill_per_sec, tokens=float(self.capacity), last_refill=time.time())
            self._buckets[key] = bucket
        return bucket.allow()

