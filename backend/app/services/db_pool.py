"""
Optimized database connection pooling and caching for 2M user scalability.
Implements connection pooling, query result caching, and batch operations.
"""

import asyncio
import logging
from typing import Any, Optional, Dict, List, Callable
from datetime import datetime, timedelta
from functools import lru_cache
from contextlib import asynccontextmanager

from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine, async_sessionmaker

logger = logging.getLogger(__name__)


class CacheEntry:
    """A cache entry with TTL (time-to-live)."""

    def __init__(self, value: Any, ttl_seconds: int = 300):
        self.value = value
        self.created_at = datetime.now()
        self.ttl_seconds = ttl_seconds

    def is_expired(self) -> bool:
        """Check if cache entry has expired."""
        return (datetime.now() - self.created_at).total_seconds() > self.ttl_seconds


class CachedQueryResult:
    """Thread-safe cache for query results."""

    def __init__(self, max_size: int = 10000):
        self.cache: Dict[str, CacheEntry] = {}
        self.max_size = max_size
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired."""
        async with self._lock:
            if key not in self.cache:
                return None
            entry = self.cache[key]
            if entry.is_expired():
                del self.cache[key]
                return None
            return entry.value

    async def set(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        """Set value in cache with TTL."""
        async with self._lock:
            # Implement LRU eviction if cache is full
            if len(self.cache) >= self.max_size:
                oldest_key = min(
                    self.cache.keys(),
                    key=lambda k: self.cache[k].created_at,
                )
                del self.cache[oldest_key]
                logger.debug(f"Cache evicted oldest entry: {oldest_key}")

            self.cache[key] = CacheEntry(value, ttl_seconds)

    async def clear(self) -> None:
        """Clear all cache entries."""
        async with self._lock:
            self.cache.clear()

    async def cleanup_expired(self) -> int:
        """Remove expired entries. Returns count of removed entries."""
        async with self._lock:
            expired_keys = [
                key for key, entry in self.cache.items() if entry.is_expired()
            ]
            for key in expired_keys:
                del self.cache[key]
            return len(expired_keys)


class DatabaseConnectionPool:
    """
    Manages database connections with pooling, optimized for 2M users.
    
    Pool configuration:
    - pool_size: minimum connections to keep open
    - max_overflow: maximum connections above pool_size
    - pool_pre_ping: test connection before using (prevents stale connections)
    - echo_pool: log pool events for debugging
    """

    def __init__(
        self,
        database_url: str,
        pool_size: int = 20,
        max_overflow: int = 40,
        pool_recycle: int = 3600,  # Recycle connections every hour
        echo: bool = False,
    ):
        self.database_url = database_url
        self.pool_size = pool_size
        self.max_overflow = max_overflow
        self.pool_recycle = pool_recycle
        self.echo = echo
        self._engine: Optional[AsyncEngine] = None
        self._session_maker: Optional[async_sessionmaker] = None
        self._query_cache = CachedQueryResult(max_size=10000)

    async def initialize(self) -> None:
        """Initialize the connection pool."""
        try:
            # Create async engine with connection pooling
            self._engine = create_async_engine(
                self.database_url,
                poolclass=QueuePool,
                pool_size=self.pool_size,
                max_overflow=self.max_overflow,
                pool_recycle=self.pool_recycle,
                pool_pre_ping=True,  # Test connections before using
                echo=self.echo,
                connect_args={
                    "timeout": 30,
                    "server_settings": {
                        "jit": "off",  # Disable JIT for predictable performance
                        "synchronous_commit": "local",  # Faster commits for non-critical data
                    },
                },
            )
            self._session_maker = async_sessionmaker(
                self._engine, expire_on_commit=False
            )
            logger.info(
                f"Database connection pool initialized: "
                f"pool_size={self.pool_size}, max_overflow={self.max_overflow}"
            )
        except Exception as e:
            logger.error(f"Failed to initialize connection pool: {e}")
            raise

    @asynccontextmanager
    async def get_session(self):
        """Get a database session from the pool."""
        if self._session_maker is None:
            raise RuntimeError("Database pool not initialized. Call initialize() first.")
        
        async with self._session_maker() as session:
            yield session

    async def close(self) -> None:
        """Close all connections in the pool."""
        if self._engine:
            await self._engine.dispose()
            logger.info("Database connection pool closed")

    async def get_pool_status(self) -> Dict[str, Any]:
        """Get connection pool statistics."""
        if self._engine is None:
            return {"status": "not_initialized"}

        pool = self._engine.pool
        return {
            "pool_size": self.pool_size,
            "max_overflow": self.max_overflow,
            "current_connections": pool.size(),
            "checked_out": pool.checkedout(),
            "cache_size": len(self._query_cache.cache),
            "cache_expired_entries": await self._query_cache.cleanup_expired(),
        }


class QueryCache:
    """
    Query result caching decorator for frequently accessed data.
    Implements automatic TTL and LRU eviction.
    """

    def __init__(self, cache: CachedQueryResult):
        self.cache = cache

    def _make_cache_key(self, query_name: str, *args, **kwargs) -> str:
        """Generate cache key from query parameters."""
        key_parts = [query_name]
        key_parts.extend(str(arg) for arg in args)
        key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
        return ":".join(key_parts)

    def cached(
        self, query_name: str, ttl_seconds: int = 300
    ) -> Callable:
        """Decorator to cache query results."""
        def decorator(func: Callable) -> Callable:
            async def wrapper(*args, **kwargs):
                cache_key = self._make_cache_key(query_name, *args, **kwargs)
                
                # Try to get from cache
                cached_result = await self.cache.get(cache_key)
                if cached_result is not None:
                    logger.debug(f"Cache hit for {query_name}")
                    return cached_result

                # Execute query and cache result
                result = await func(*args, **kwargs)
                await self.cache.set(cache_key, result, ttl_seconds)
                logger.debug(f"Cached result for {query_name} (TTL: {ttl_seconds}s)")
                return result

            return wrapper
        return decorator


class BatchQueryProcessor:
    """
    Processes queries in batches for better performance.
    Reduces database round-trips and improves throughput.
    """

    def __init__(self, batch_size: int = 100, timeout_ms: int = 50):
        self.batch_size = batch_size
        self.timeout_ms = timeout_ms
        self._pending_queries: List[dict] = []
        self._lock = asyncio.Lock()

    async def add_query(self, query_id: str, query_func: Callable, *args, **kwargs) -> Any:
        """Add a query to the batch."""
        async with self._lock:
            self._pending_queries.append({
                "id": query_id,
                "func": query_func,
                "args": args,
                "kwargs": kwargs,
            })

            # Process batch if size reached
            if len(self._pending_queries) >= self.batch_size:
                return await self._process_batch()

        # Wait for timeout or batch to fill
        await asyncio.sleep(self.timeout_ms / 1000.0)
        async with self._lock:
            if self._pending_queries:
                return await self._process_batch()

    async def _process_batch(self) -> List[Any]:
        """Process all pending queries."""
        if not self._pending_queries:
            return []

        queries = self._pending_queries.copy()
        self._pending_queries.clear()

        results = []
        tasks = [
            query["func"](*query["args"], **query["kwargs"])
            for query in queries
        ]

        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            logger.info(f"Processed batch of {len(queries)} queries")
        except Exception as e:
            logger.error(f"Batch query processing failed: {e}")
            raise

        return results


# Singleton instances
_db_pool: Optional[DatabaseConnectionPool] = None
_query_cache: Optional[QueryCache] = None


async def initialize_db_pool(
    database_url: str,
    pool_size: int = 20,
    max_overflow: int = 40,
) -> DatabaseConnectionPool:
    """Initialize and return the global database pool."""
    global _db_pool, _query_cache

    if _db_pool is None:
        _db_pool = DatabaseConnectionPool(
            database_url,
            pool_size=pool_size,
            max_overflow=max_overflow,
        )
        await _db_pool.initialize()
        _query_cache = QueryCache(_db_pool._query_cache)

    return _db_pool


def get_db_pool() -> DatabaseConnectionPool:
    """Get the global database pool."""
    if _db_pool is None:
        raise RuntimeError("Database pool not initialized")
    return _db_pool


def get_query_cache() -> QueryCache:
    """Get the global query cache."""
    if _query_cache is None:
        raise RuntimeError("Query cache not initialized")
    return _query_cache


async def close_db_pool() -> None:
    """Close the global database pool."""
    global _db_pool
    if _db_pool:
        await _db_pool.close()
        _db_pool = None
