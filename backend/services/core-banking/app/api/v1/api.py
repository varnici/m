from fastapi import APIRouter

from app.api.v1.endpoints import (
    artisans, dashboard, loans, marketplace, sales, transport, users, wallet,
    inventory, analytics, ai, savings, automation, credit, transactions,
    worker_module, shopfront, velocity, product_savings,
)
from app.api.v1.endpoints.clusters import router as clusters_router

api_router = APIRouter()
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(wallet.router, prefix="/wallet", tags=["wallet"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(savings.router, prefix="/budget-best", tags=["budget-best"])
api_router.include_router(automation.router, prefix="/automation", tags=["automation"])
api_router.include_router(credit.router, prefix="/credit", tags=["credit"])
api_router.include_router(sales.router, prefix="/sales", tags=["sales"])
api_router.include_router(loans.router, prefix="/loans", tags=["loans"])
api_router.include_router(marketplace.router, prefix="/marketplace", tags=["marketplace"])
api_router.include_router(artisans.router, prefix="/artisans", tags=["artisans"])
api_router.include_router(transport.router, prefix="/transport", tags=["transport"])
api_router.include_router(clusters_router, prefix="/clusters", tags=["clusters"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
api_router.include_router(analytics.router, prefix="/inventory-analytics", tags=["inventory-analytics"])
api_router.include_router(ai.router, prefix="/inventory-ai", tags=["inventory-ai"])
api_router.include_router(worker_module.router, prefix="/worker", tags=["worker-module"])
api_router.include_router(shopfront.router, prefix="/shopfront", tags=["shopfront"])
api_router.include_router(velocity.router, prefix="/velocity", tags=["velocity"])
api_router.include_router(product_savings.router, prefix="/product-savings", tags=["product-savings"])

