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
    Dev-only in-memory rate limiter. Each gateway replica counts independently,
    so the effective limit multiplies by replica count — fine for local dev,
    wrong for a multi-replica deployment. Use RedisRateLimiter there instead.
    """

    def __init__(self, *, capacity: int = 60, refill_per_sec: float = 1.0) -> None:
        self.capacity = capacity
        self.refill_per_sec = refill_per_sec
        self._buckets: dict[str, TokenBucket] = {}

    async def allow(self, key: str) -> bool:
        bucket = self._buckets.get(key)
        if bucket is None:
            bucket = TokenBucket(capacity=self.capacity, refill_per_sec=self.refill_per_sec, tokens=float(self.capacity), last_refill=time.time())
            self._buckets[key] = bucket
        return bucket.allow()


# Atomic token-bucket check-and-consume. Runs as a single Redis command so
# concurrent gateway replicas hitting the same key can't race each other.
_TOKEN_BUCKET_LUA = """
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_per_sec = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])
local ttl = tonumber(ARGV[5])

local bucket = redis.call("HMGET", key, "tokens", "last_refill")
local tokens = tonumber(bucket[1])
local last_refill = tonumber(bucket[2])

if tokens == nil then
  tokens = capacity
  last_refill = now
end

local elapsed = math.max(0, now - last_refill)
tokens = math.min(capacity, tokens + elapsed * refill_per_sec)

local allowed = 0
if tokens >= cost then
  tokens = tokens - cost
  allowed = 1
end

redis.call("HMSET", key, "tokens", tostring(tokens), "last_refill", tostring(now))
redis.call("EXPIRE", key, ttl)

return allowed
"""


class RedisRateLimiter:
    """
    Token-bucket rate limiter backed by Redis, shared correctly across every
    gateway replica instead of each one counting independently.
    """

    def __init__(self, redis_client, *, capacity: int = 60, refill_per_sec: float = 1.0) -> None:
        self._redis = redis_client
        self.capacity = capacity
        self.refill_per_sec = refill_per_sec
        # A bucket that's been idle long enough to fully refill has no more
        # state worth keeping — expire it instead of retaining it forever.
        self._ttl_seconds = max(60, int(capacity / refill_per_sec) * 2)
        self._script = redis_client.register_script(_TOKEN_BUCKET_LUA)

    async def allow(self, key: str) -> bool:
        result = await self._script(
            keys=[f"ratelimit:{key}"],
            args=[self.capacity, self.refill_per_sec, time.time(), 1.0, self._ttl_seconds],
        )
        return bool(result)
