from fastapi import APIRouter

from app.api.v1.endpoints import artisans, dashboard, loans, marketplace, sales, transport, users, wallet, inventory
from app.api.v1.endpoints.clusters import router as clusters_router

api_router = APIRouter()
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(wallet.router, prefix="/wallet", tags=["wallet"])
api_router.include_router(sales.router, prefix="/sales", tags=["sales"])
api_router.include_router(loans.router, prefix="/loans", tags=["loans"])
api_router.include_router(marketplace.router, prefix="/marketplace", tags=["marketplace"])
api_router.include_router(artisans.router, prefix="/artisans", tags=["artisans"])
api_router.include_router(transport.router, prefix="/transport", tags=["transport"])
api_router.include_router(clusters_router, prefix="/clusters", tags=["clusters"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
