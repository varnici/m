from __future__ import annotations

import json
import logging
import os
from functools import lru_cache
from typing import Any, Optional

import redis

logger = logging.getLogger(__name__)


@lru_cache
def redis_client() -> redis.Redis:
    """
    Returns a cached instance of the Redis client connection pool.
    """
    url = os.getenv("REDIS_URL", "redis://redis:6379/0")
    return redis.Redis.from_url(url, decode_responses=True)


def get_cache(key: str) -> Optional[Any]:
    """
    Retrieves a JSON-deserialized value from Redis for the given key.
    Falls back to None on any cache failure.
    """
    try:
        client = redis_client()
        data = client.get(key)
        if data:
            return json.loads(data)
    except (redis.RedisError, ConnectionError, Exception) as exc:
        logger.warning(
            "Redis cache read failed for key '%s'. Gracefully falling back. Detail: %s",
            key,
            exc,
        )
    return None


def set_cache(key: str, value: Any, ttl: int = 300) -> None:
    """
    Stores a JSON-serialized value in Redis under the given key with a TTL (in seconds).
    Succeeds silently on any cache failure.
    """
    try:
        client = redis_client()
        serialized = json.dumps(value)
        client.setex(key, ttl, serialized)
    except (redis.RedisError, ConnectionError, Exception) as exc:
        logger.warning(
            "Redis cache write failed for key '%s'. Gracefully falling back. Detail: %s",
            key,
            exc,
        )


def invalidate_cache_pattern(pattern: str) -> None:
    """
    Deletes all keys matching the specified pattern from Redis.
    Succeeds silently on any cache failure.
    """
    try:
        client = redis_client()
        keys = client.keys(pattern)
        if keys:
            client.delete(*keys)
    except (redis.RedisError, ConnectionError, Exception) as exc:
        logger.warning(
            "Redis cache invalidation failed for pattern '%s'. Gracefully falling back. Detail: %s",
            pattern,
            exc,
        )
