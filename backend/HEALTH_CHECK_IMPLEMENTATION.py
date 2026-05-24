"""
Health Check Endpoint Implementation Guide

All backend services MUST implement a health check endpoint for:
1. Docker health checks (liveness probes)
2. Kubernetes health probes (liveness & readiness)
3. Load balancer verification
4. Operational visibility

This module provides a reusable health check implementation for FastAPI services.
"""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.pool import NullPool
from sqlalchemy import text
import asyncio
from typing import Dict, Any
import redis
import logging

logger = logging.getLogger(__name__)

class HealthChecker:
    """
    Comprehensive health check for microservices.
    Monitors: service readiness, database, cache, external dependencies.
    """
    
    def __init__(self, service_name: str, db_session=None, redis_client=None):
        """
        Initialize health checker with optional dependencies.
        
        Args:
            service_name: Name of the service for identification
            db_session: SQLAlchemy session (optional)
            redis_client: Redis client instance (optional)
        """
        self.service_name = service_name
        self.db_session = db_session
        self.redis_client = redis_client
    
    async def check_database(self) -> Dict[str, Any]:
        """Check PostgreSQL database connectivity."""
        if not self.db_session:
            return {"status": "skipped", "reason": "No database configured"}
        
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(
                    lambda: self.db_session.execute(
                        text("SELECT 1")
                    ).fetchone()
                ),
                timeout=5.0
            )
            return {
                "status": "healthy",
                "response_time_ms": 0  # Would be measured in production
            }
        except asyncio.TimeoutError:
            return {
                "status": "unhealthy",
                "reason": "Database query timeout (>5s)"
            }
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "status": "unhealthy",
                "reason": str(e)
            }
    
    async def check_redis(self) -> Dict[str, Any]:
        """Check Redis cache connectivity."""
        if not self.redis_client:
            return {"status": "skipped", "reason": "Redis not configured"}
        
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(
                    lambda: self.redis_client.ping()
                ),
                timeout=3.0
            )
            return {
                "status": "healthy" if result else "unhealthy",
                "response_time_ms": 0
            }
        except asyncio.TimeoutError:
            return {
                "status": "unhealthy",
                "reason": "Redis connection timeout (>3s)"
            }
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return {
                "status": "unhealthy",
                "reason": str(e)
            }
    
    async def get_status(self) -> Dict[str, Any]:
        """
        Get comprehensive health status.
        
        Returns:
            - status: "healthy" | "degraded" | "unhealthy"
            - service: Service name
            - version: Service version (if available)
            - checks: Individual component status
            - timestamp: ISO format timestamp
        """
        db_health = await self.check_database()
        redis_health = await self.check_redis()
        
        # Determine overall status
        checks = {
            "database": db_health,
            "redis": redis_health
        }
        
        statuses = [check.get("status") for check in checks.values()]
        
        if "unhealthy" in statuses:
            overall_status = "unhealthy"
        elif "degraded" in statuses:
            overall_status = "degraded"
        else:
            overall_status = "healthy"
        
        return {
            "status": overall_status,
            "service": self.service_name,
            "checks": checks,
            "timestamp": pd.Timestamp.now(tz='UTC').isoformat() if 'pd' in globals() else None
        }


def create_health_router(
    service_name: str,
    db_session=None,
    redis_client=None
) -> APIRouter:
    """
    Factory function to create a health check router.
    
    Usage in your FastAPI app:
        from fastapi import FastAPI
        app = FastAPI()
        health_router = create_health_router(
            "core-banking",
            db_session=get_db(),
            redis_client=redis_client
        )
        app.include_router(health_router)
    """
    router = APIRouter(prefix="/health", tags=["health"])
    health_checker = HealthChecker(service_name, db_session, redis_client)
    
    @router.get("/", status_code=status.HTTP_200_OK)
    @router.get("", status_code=status.HTTP_200_OK)
    async def health_check():
        """
        GET /health
        
        Returns comprehensive health status. Used by:
        - Docker healthcheck
        - Kubernetes liveness probe
        - Load balancers (ALB, NLB)
        
        Response 200: Service is healthy
        Response 503: Service is unhealthy
        """
        status_info = await health_checker.get_status()
        
        if status_info["status"] == "healthy":
            return status_info
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=status_info
            )
    
    @router.get("/live", status_code=status.HTTP_200_OK)
    async def liveness():
        """
        GET /health/live
        
        Kubernetes liveness probe. Keep simple - just check if service is running.
        Used to determine if container should be restarted.
        """
        return {"status": "alive", "service": service_name}
    
    @router.get("/ready", status_code=status.HTTP_200_OK)
    async def readiness():
        """
        GET /health/ready
        
        Kubernetes readiness probe. Check if service is ready to serve traffic.
        More comprehensive than liveness.
        """
        status_info = await health_checker.get_status()
        
        if status_info["status"] in ["healthy", "degraded"]:
            return status_info
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Service not ready to accept traffic"
            )
    
    return router


# ============================================
# IMPLEMENTATION EXAMPLES BY SERVICE
# ============================================

# EXAMPLE 1: Core Banking Service (main:app)
# File: backend/services/core-banking/app/main.py

"""
from fastapi import FastAPI
from app.health import create_health_router
from app.database import get_db, engine
from app.cache import redis_client

app = FastAPI(title="Core Banking Service")

# Add health check router
health_router = create_health_router(
    "core-banking",
    db_session=get_db,
    redis_client=redis_client
)
app.include_router(health_router)

@app.on_event("startup")
async def startup():
    # Initialize services
    pass
"""

# EXAMPLE 2: AI/ML Service
"""
from fastapi import FastAPI
from app.health import create_health_router

app = FastAPI(title="AI/ML Service")

health_router = create_health_router("ai-ml-service")
app.include_router(health_router)
"""

# EXAMPLE 3: RAG Service with Optional Dependencies
"""
from fastapi import FastAPI
from app.health import create_health_router
from app.cache import redis_client

app = FastAPI(title="RAG Service")

health_router = create_health_router(
    "rag-service",
    redis_client=redis_client  # Optional: only if using Redis
)
app.include_router(health_router)
"""

# ============================================
# TESTING HEALTH ENDPOINTS
# ============================================

# Unit test example
"""
import pytest
from fastapi.testclient import TestClient

def test_health_check():
    from app.main import app
    client = TestClient(app)
    
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] in ["healthy", "degraded", "unhealthy"]
    assert "service" in data
    assert "checks" in data

def test_health_endpoints_exist():
    client = TestClient(app)
    
    endpoints = ["/health", "/health/", "/health/live", "/health/ready"]
    for endpoint in endpoints:
        response = client.get(endpoint)
        assert response.status_code in [200, 503]
"""

# ============================================
# DOCKER COMPOSE USAGE
# ============================================

"""
# In docker-compose.yml, use like this:

services:
  core-banking:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 30s      # Check every 30 seconds
      timeout: 10s       # Fail if no response in 10 seconds
      retries: 3         # Mark unhealthy after 3 failed checks
      start_period: 40s  # Grace period after container start
"""

# ============================================
# KUBERNETES PROBES
# ============================================

"""
# In K8s deployment.yaml:

spec:
  containers:
    - name: core-banking
      livenessProbe:
        httpGet:
          path: /health/live
          port: 8001
        initialDelaySeconds: 30
        periodSeconds: 10
        timeoutSeconds: 5
        failureThreshold: 3
      
      readinessProbe:
        httpGet:
          path: /health/ready
          port: 8001
        initialDelaySeconds: 20
        periodSeconds: 10
        timeoutSeconds: 5
        failureThreshold: 3
"""
