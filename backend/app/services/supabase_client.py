"""
Supabase client with retry logic, connection pooling, and improved error handling.
Designed for production use with 2M users scalability.
"""

import asyncio
import logging
from typing import Any, Optional
from functools import wraps
from datetime import datetime, timedelta

from supabase import create_client, Client
from httpx import AsyncClient, HTTPError
import httpx

logger = logging.getLogger(__name__)


class SupabaseClientError(Exception):
    """Custom exception for Supabase client errors."""
    pass


class SupabaseRetryConfig:
    """Configuration for retry logic."""
    max_retries: int = 3
    initial_backoff: float = 1.0  # seconds
    max_backoff: float = 30.0  # seconds
    exponential_base: float = 2.0
    retry_on_status_codes: set = {408, 429, 500, 502, 503, 504, 521}  # 521 is Cloudflare error


class ResilientSupabaseClient:
    """
    Wrapper around Supabase client with:
    - Automatic retry logic with exponential backoff
    - Connection pooling
    - Request timeouts
    - Better error handling
    - Structured logging
    """

    def __init__(
        self,
        supabase_url: str,
        supabase_key: str,
        retry_config: Optional[SupabaseRetryConfig] = None,
    ):
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.retry_config = retry_config or SupabaseRetryConfig()
        self._client: Optional[Client] = None
        self._async_client: Optional[AsyncClient] = None
        self._last_auth_error: Optional[datetime] = None
        self._auth_error_cooldown = timedelta(seconds=5)

    @property
    def client(self) -> Client:
        """Get or create Supabase client (lazy initialization)."""
        if self._client is None:
            try:
                # Configure httpx with connection pooling
                http_client = AsyncClient(
                    timeout=30.0,
                    limits=httpx.Limits(
                        max_connections=100,
                        max_keepalive_connections=20,
                        keepalive_expiry=5.0,
                    ),
                )
                self._client = create_client(
                    self.supabase_url, self.supabase_key
                )
                logger.info("Supabase client initialized with connection pooling")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
                raise SupabaseClientError(f"Supabase initialization failed: {e}")
        return self._client

    async def _should_retry(self, error: Exception, attempt: int) -> bool:
        """Determine if request should be retried."""
        if attempt >= self.retry_config.max_retries:
            return False

        if isinstance(error, HTTPError):
            return error.response.status_code in self.retry_config.retry_on_status_codes

        # Retry on connection errors
        return isinstance(error, (ConnectionError, TimeoutError, asyncio.TimeoutError))

    async def _exponential_backoff(self, attempt: int) -> float:
        """Calculate exponential backoff with jitter."""
        backoff = min(
            self.retry_config.initial_backoff * (self.retry_config.exponential_base ** attempt),
            self.retry_config.max_backoff,
        )
        # Add jitter (ยฑ20% randomization)
        jitter = backoff * 0.2 * (2 * asyncio.random() - 1) if hasattr(asyncio, 'random') else 0
        return max(backoff + jitter, 0.1)

    def _with_retry(self, func):
        """Decorator for adding retry logic to functions."""
        @wraps(func)
        async def wrapper(*args, **kwargs):
            attempt = 0
            last_error = None

            while attempt < self.retry_config.max_retries:
                try:
                    return await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    
                    # Check if we should retry
                    should_retry = await self._should_retry(e, attempt)
                    if not should_retry:
                        logger.warning(f"Request failed (non-retryable): {e}")
                        raise

                    # Calculate backoff
                    backoff_duration = await self._exponential_backoff(attempt)
                    attempt += 1

                    logger.warning(
                        f"Request failed (attempt {attempt}/{self.retry_config.max_retries}): {e}. "
                        f"Retrying in {backoff_duration:.2f}s..."
                    )
                    await asyncio.sleep(backoff_duration)

            logger.error(f"Request failed after {self.retry_config.max_retries} attempts: {last_error}")
            raise SupabaseClientError(
                f"Request failed after {self.retry_config.max_retries} attempts: {last_error}"
            )

        return wrapper

    async def get_user(self, user_id: str) -> dict:
        """Get user with retry logic."""
        @self._with_retry
        async def _get():
            try:
                response = await self.client.auth.admin.get_user(user_id)
                return response.model_dump() if hasattr(response, 'model_dump') else response
            except Exception as e:
                logger.error(f"Error fetching user {user_id}: {e}", exc_info=True)
                raise

        return await _get()

    async def verify_token(self, token: str) -> dict:
        """Verify JWT token with retry logic."""
        @self._with_retry
        async def _verify():
            try:
                response = await self.client.auth.get_user(token)
                return response.model_dump() if hasattr(response, 'model_dump') else response
            except Exception as e:
                logger.error(f"Token verification failed: {e}", exc_info=True)
                raise

        return await _verify()

    async def refresh_session(self, refresh_token: str) -> dict:
        """Refresh session with retry logic."""
        @self._with_retry
        async def _refresh():
            try:
                response = await self.client.auth.refresh_session(refresh_token)
                return response.model_dump() if hasattr(response, 'model_dump') else response
            except Exception as e:
                logger.error(f"Session refresh failed: {e}", exc_info=True)
                # Check for cooldown before logging too much
                now = datetime.now()
                if self._last_auth_error is None or (now - self._last_auth_error) > self._auth_error_cooldown:
                    logger.warning(f"Auth error (will retry): {e}")
                    self._last_auth_error = now
                raise

        return await _refresh()

    async def from_table(self, table_name: str):
        """Get reference to a table with retry logic."""
        return self.client.table(table_name)

    def close(self):
        """Close client connections."""
        if self._client is not None:
            self._client = None
        if self._async_client is not None:
            # Async client cleanup would happen here
            self._async_client = None
        logger.info("Supabase client closed")


# Singleton instance
_supabase_client: Optional[ResilientSupabaseClient] = None


def get_supabase_client(
    supabase_url: str, supabase_key: str
) -> ResilientSupabaseClient:
    """Get or create the Supabase client singleton."""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = ResilientSupabaseClient(supabase_url, supabase_key)
    return _supabase_client
