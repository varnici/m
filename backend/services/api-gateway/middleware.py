"""
Advanced middleware for API Gateway with error handling, logging, and monitoring.
Optimized for 2M user scalability.
"""

import logging
import time
import json
from typing import Callable, Any
from datetime import datetime

from fastapi import Request, Response
from fastapi.responses import JSONResponse
import structlog

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


class ErrorTracker:
    """Track and report error rates for monitoring."""

    def __init__(self):
        self.error_counts = {}
        self.last_report_time = time.time()
        self.report_interval = 60  # seconds

    def track_error(self, error_type: str, status_code: int = None):
        """Track error occurrence."""
        key = f"{error_type}:{status_code}" if status_code else error_type
        self.error_counts[key] = self.error_counts.get(key, 0) + 1

    def should_report(self) -> bool:
        """Check if we should report error stats."""
        return (time.time() - self.last_report_time) > self.report_interval

    def get_report(self) -> dict:
        """Get and reset error stats."""
        report = self.error_counts.copy()
        self.error_counts.clear()
        self.last_report_time = time.time()
        return report


error_tracker = ErrorTracker()


async def error_handling_middleware(request: Request, call_next: Callable) -> Response:
    """
    Middleware for comprehensive error handling and logging.
    Handles validation errors, authentication errors, and unexpected exceptions.
    """
    request_id = request.headers.get("x-request-id", f"{datetime.now().timestamp()}")
    request.state.request_id = request_id

    start_time = time.time()
    client_ip = (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or request.client.host
        if request.client
        else "unknown"
    )

    try:
        response = await call_next(request)
        process_time = time.time() - start_time

        # Log successful requests
        logger.info(
            "request_completed",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            process_time=f"{process_time:.4f}s",
            client_ip=client_ip,
        )

        # Add performance headers
        response.headers["X-Process-Time"] = str(process_time)
        response.headers["X-Request-ID"] = request_id

        return response

    except ValueError as e:
        """Handle validation errors (invalid input)."""
        error_tracker.track_error("ValueError", 400)
        logger.warning(
            "validation_error",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            client_ip=client_ip,
            error=str(e),
        )
        return JSONResponse(
            status_code=400,
            content={
                "error": "Validation Error",
                "message": str(e),
                "request_id": request_id,
            },
        )

    except PermissionError as e:
        """Handle authentication/authorization errors."""
        error_tracker.track_error("PermissionError", 401)
        logger.warning(
            "auth_error",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            client_ip=client_ip,
            error=str(e),
        )
        return JSONResponse(
            status_code=401,
            content={
                "error": "Authentication Error",
                "message": "Invalid or missing credentials",
                "request_id": request_id,
            },
        )

    except TimeoutError as e:
        """Handle timeout errors."""
        error_tracker.track_error("TimeoutError", 504)
        logger.error(
            "timeout_error",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            client_ip=client_ip,
            error=str(e),
        )
        return JSONResponse(
            status_code=504,
            content={
                "error": "Request Timeout",
                "message": "The request took too long to process",
                "request_id": request_id,
            },
        )

    except ConnectionError as e:
        """Handle service connectivity errors."""
        error_tracker.track_error("ConnectionError", 503)
        logger.error(
            "connection_error",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            client_ip=client_ip,
            error=str(e),
        )
        return JSONResponse(
            status_code=503,
            content={
                "error": "Service Unavailable",
                "message": "Unable to reach backend services",
                "request_id": request_id,
            },
        )

    except Exception as e:
        """Handle unexpected errors."""
        error_tracker.track_error("Exception", 500)
        logger.error(
            "unexpected_error",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            client_ip=client_ip,
            error=str(e),
            exc_info=True,
        )

        # Report error stats if interval reached
        if error_tracker.should_report():
            logger.warning(
                "error_rate_report",
                error_stats=error_tracker.get_report(),
            )

        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "message": "An unexpected error occurred",
                "request_id": request_id,
            },
        )


async def request_logging_middleware(request: Request, call_next: Callable) -> Response:
    """Log all incoming requests with details."""
    method = request.method
    path = request.url.path
    query_string = request.url.query

    logger.info(
        "request_received",
        method=method,
        path=path,
        query_string=query_string,
    )

    response = await call_next(request)
    return response


class CircuitBreaker:
    """
    Simple circuit breaker for handling cascading failures.
    Prevents overwhelming failed services.
    """

    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failures = 0
        self.last_failure_time = None
        self.is_open = False

    def record_success(self):
        """Record successful request."""
        self.failures = 0
        self.is_open = False

    def record_failure(self):
        """Record failed request."""
        self.failures += 1
        self.last_failure_time = time.time()

        if self.failures >= self.failure_threshold:
            self.is_open = True
            logger.warning(
                "circuit_breaker_opened",
                failures=self.failures,
                threshold=self.failure_threshold,
            )

    def is_closed(self) -> bool:
        """Check if circuit breaker is closed (accepting requests)."""
        if not self.is_open:
            return True

        # Check if timeout has passed to attempt recovery
        if (
            self.last_failure_time
            and (time.time() - self.last_failure_time) > self.timeout
        ):
            self.is_open = False
            self.failures = 0
            logger.info("circuit_breaker_recovered")
            return True

        return False


# Service-specific circuit breakers
circuit_breakers = {
    "core-banking": CircuitBreaker(),
    "ai-ml-service": CircuitBreaker(),
    "rag-service": CircuitBreaker(),
    "ussd-service": CircuitBreaker(),
}


def get_circuit_breaker(service_name: str) -> CircuitBreaker:
    """Get circuit breaker for a service."""
    return circuit_breakers.get(
        service_name, CircuitBreaker()
    )
