"""Proxy routes to core-banking and other microservices."""
from fastapi import APIRouter, Request, HTTPException
from httpx import AsyncClient
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

CORE_BANKING_URL = "http://localhost:8001"
AI_ML_SERVICE_URL = "http://localhost:8002"
RAG_SERVICE_URL = "http://localhost:8003"


async def proxy_request(
    method: str,
    path: str,
    request: Request,
    service_url: str,
) -> dict:
    """Forward request to microservice."""
    url = f"{service_url}{path}"
    
    # Copy headers but exclude host
    headers = dict(request.headers)
    headers.pop("host", None)
    
    try:
        async with AsyncClient() as client:
            if method == "GET":
                response = await client.get(url, headers=headers)
            elif method == "POST":
                body = await request.body()
                response = await client.post(url, content=body, headers=headers)
            elif method == "PATCH":
                body = await request.body()
                response = await client.patch(url, content=body, headers=headers)
            elif method == "DELETE":
                response = await client.delete(url, headers=headers)
            else:
                raise HTTPException(405, detail="Method not allowed")
            
            return {
                "status_code": response.status_code,
                "content": response.text,
                "headers": dict(response.headers),
            }
    except Exception as e:
        logger.error(f"Proxy error: {e}")
        raise HTTPException(502, detail=f"Service unavailable: {e}")


# ── Users & Auth (core-banking) ──────────────────────────────────────────────
@router.get("/v1/users/me")
async def get_current_user(request: Request):
    """Get current user profile."""
    result = await proxy_request("GET", "/v1/users/me", request, CORE_BANKING_URL)
    if result["status_code"] != 200:
        raise HTTPException(result["status_code"], detail=result["content"])
    import json
    return json.loads(result["content"])


@router.patch("/v1/users/me")
async def update_user_profile(request: Request):
    """Update user profile."""
    result = await proxy_request("PATCH", "/v1/users/me", request, CORE_BANKING_URL)
    if result["status_code"] != 200:
        raise HTTPException(result["status_code"], detail=result["content"])
    import json
    return json.loads(result["content"])


@router.post("/v1/users/me/security")
async def update_security(request: Request):
    """Update user security settings."""
    result = await proxy_request("POST", "/v1/users/me/security", request, CORE_BANKING_URL)
    if result["status_code"] != 200:
        raise HTTPException(result["status_code"], detail=result["content"])
    import json
    return json.loads(result["content"])


@router.post("/v1/users/me/verify-security")
async def verify_security(request: Request):
    """Verify security setup."""
    result = await proxy_request("POST", "/v1/users/me/verify-security", request, CORE_BANKING_URL)
    if result["status_code"] != 200:
        raise HTTPException(result["status_code"], detail=result["content"])
    import json
    return json.loads(result["content"])


# ── Wallet (core-banking) ────────────────────────────────────────────────────
@router.get("/v1/core/wallet/{user_id}")
async def get_wallet(user_id: str, request: Request):
    """Get user wallet."""
    result = await proxy_request("GET", f"/v1/core/wallet/{user_id}", request, CORE_BANKING_URL)
    if result["status_code"] != 200:
        raise HTTPException(result["status_code"], detail=result["content"])
    import json
    return json.loads(result["content"])


@router.post("/v1/core/wallet/{user_id}/topup")
async def topup_wallet(user_id: str, request: Request):
    """Top up wallet."""
    result = await proxy_request("POST", f"/v1/core/wallet/{user_id}/topup", request, CORE_BANKING_URL)
    if result["status_code"] != 200:
        raise HTTPException(result["status_code"], detail=result["content"])
    import json
    return json.loads(result["content"])


# ── Loans (core-banking) ─────────────────────────────────────────────────────
@router.get("/v1/core/loans/active")
async def get_active_loans(request: Request):
    """Get active loans."""
    # Get query params
    query_string = str(request.url).split("?")[1] if "?" in str(request.url) else ""
    path = f"/v1/core/loans/active?{query_string}" if query_string else "/v1/core/loans/active"
    
    result = await proxy_request("GET", path, request, CORE_BANKING_URL)
    if result["status_code"] != 200:
        raise HTTPException(result["status_code"], detail=result["content"])
    import json
    return json.loads(result["content"])


@router.get("/v1/core/loans/{loan_id}/schedule")
async def get_loan_schedule(loan_id: str, request: Request):
    """Get loan payment schedule."""
    result = await proxy_request("GET", f"/v1/core/loans/{loan_id}/schedule", request, CORE_BANKING_URL)
    if result["status_code"] != 200:
        raise HTTPException(result["status_code"], detail=result["content"])
    import json
    return json.loads(result["content"])


# ── Dashboard (core-banking) ────────────────────────────────────────────────
@router.get("/v1/dashboard/{user_id}")
async def get_dashboard(user_id: str, request: Request):
    """Get user dashboard."""
    result = await proxy_request("GET", f"/v1/dashboard/{user_id}", request, CORE_BANKING_URL)
    if result["status_code"] != 200:
        raise HTTPException(result["status_code"], detail=result["content"])
    import json
    return json.loads(result["content"])


# ── Inventory Sales (core-banking or main API?) ──────────────────────────────
@router.post("/v1/inventory/sales/process")
async def process_sale(request: Request):
    """Process inventory sale."""
    result = await proxy_request("POST", "/v1/inventory/sales/process", request, CORE_BANKING_URL)
    if result["status_code"] != 200:
        raise HTTPException(result["status_code"], detail=result["content"])
    import json
    return json.loads(result["content"])


@router.get("/v1/inventory/analytics/ledger")
async def get_ledger(request: Request):
    """Get inventory ledger."""
    query_string = str(request.url).split("?")[1] if "?" in str(request.url) else ""
    path = f"/v1/inventory/analytics/ledger?{query_string}" if query_string else "/v1/inventory/analytics/ledger"
    
    result = await proxy_request("GET", path, request, CORE_BANKING_URL)
    if result["status_code"] != 200:
        raise HTTPException(result["status_code"], detail=result["content"])
    import json
    return json.loads(result["content"])


@router.get("/v1/inventory/sales/{tx_id}")
async def get_sale(tx_id: str, request: Request):
    """Get sale by ID."""
    result = await proxy_request("GET", f"/v1/inventory/sales/{tx_id}", request, CORE_BANKING_URL)
    if result["status_code"] != 200:
        raise HTTPException(result["status_code"], detail=result["content"])
    import json
    return json.loads(result["content"])


@router.patch("/v1/inventory/sales/{tx_id}")
async def update_sale(tx_id: str, request: Request):
    """Update sale."""
    result = await proxy_request("PATCH", f"/v1/inventory/sales/{tx_id}", request, CORE_BANKING_URL)
    if result["status_code"] != 200:
        raise HTTPException(result["status_code"], detail=result["content"])
    import json
    return json.loads(result["content"])


@router.post("/v1/inventory/marketplace/checkout")
async def checkout(request: Request):
    """Marketplace checkout."""
    result = await proxy_request("POST", "/v1/inventory/marketplace/checkout", request, CORE_BANKING_URL)
    if result["status_code"] != 200:
        raise HTTPException(result["status_code"], detail=result["content"])
    import json
    return json.loads(result["content"])
