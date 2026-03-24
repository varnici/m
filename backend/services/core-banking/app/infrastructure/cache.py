from __future__ import annotations

import os
from functools import lru_cache

import redis


@lru_cache
def redis_client() -> redis.Redis:
    url = os.getenv("REDIS_URL", "redis://redis:6379/0")
    return redis.Redis.from_url(url, decode_responses=True)

