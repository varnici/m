"""Inventory CRUD endpoints."""
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query

from app.models.inventory import (
    InventoryCreate, InventoryUpdate, InventoryRecord, SummaryResponse
)ta Studio into the MSSQL extension. Additionally, the MSSQL Data Management Keymap can be installed to add familiar shortcuts from Azure Data Studio.
￼
Try it
￼
Watch demo
￼
Learn more
￼
￼
In case you missed it
Previously released features you may not have explored yet.
Resources
Explore tutorials, docs, and what's coming next.

￼
Watch demos on YouTube
￼
View roadmap
￼
Read docs on Microsoft Learn
Feedback
Help us improve by sharing your thoughts.

￼
Open a new bug
￼
Request a new feature
￼
Join the discussions
￼
GitHub Copilot survey
Getting Started
New to the MSSQL extension? Check out our quick-start guide.

￼
MSSQL - VS Code walkthrough
￼
GitHub Copilot - VS Code walkthrough
￼
Customize keyboard shortcuts
You are seeing this message because you updated the MSSQL extension to version 1.42.2.
from app.services import inventory_service as svc
from app.middleware.security import limiter
from fastapi import Request

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.post("/", response_model=InventoryRecord, status_code=201)
@limiter.limit("60/minute")
def create(request: Request, payload: InventoryCreate) -> InventoryRecord:
    """Create a new inventory item."""
    try:
        # Validate sold <= quantity
        if payload.sold > payload.quantity:
            raise HTTPException(400, detail="sold cannot exceed quantity")
        return svc.create_item(payload)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))


@router.get("/", response_model=list[InventoryRecord])
@limiter.limit("120/minute")
def list_all(
    request: Request,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[InventoryRecord]:
    """List all inventory items."""
    return svc.list_items(limit=limit, offset=offset)


@router.get("/summary", response_model=SummaryResponse)
@limiter.limit("60/minute")
def summary(request: Request) -> SummaryResponse:
    """Get inventory summary."""
    return svc.get_summary()


@router.get("/{item_id}", response_model=InventoryRecord)
@limiter.limit("120/minute")
def get_one(request: Request, item_id: UUID) -> InventoryRecord:
    """Get a single inventory item."""
    item = svc.get_item(item_id)
    if not item:
        raise HTTPException(404, detail="Record not found")
    return item


@router.patch("/{item_id}", response_model=InventoryRecord)
@limiter.limit("60/minute")
def update(request: Request, item_id: UUID, payload: InventoryUpdate) -> InventoryRecord:
    """Update an inventory item."""
    item = svc.update_item(item_id, payload)
    if not item:
        raise HTTPException(404, detail="Record not found")
    return item


@router.delete("/{item_id}", status_code=204)
@limiter.limit("30/minute")
def delete(request: Request, item_id: UUID) -> None:
    """Delete an inventory item."""
    ok = svc.delete_item(item_id)
    if not ok:
        raise HTTPException(404, detail="Record not found")
