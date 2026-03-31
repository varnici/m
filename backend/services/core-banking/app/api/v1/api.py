from fastapi import APIRouter

from app.api.v1.endpoints import artisans, loans, marketplace, sales, transport, users, wallet

api_router = APIRouter()
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(wallet.router, prefix="/wallet", tags=["wallet"])
api_router.include_router(sales.router, prefix="/sales", tags=["sales"])
api_router.include_router(loans.router, prefix="/loans", tags=["loans"])
api_router.include_router(marketplace.router, prefix="/marketplace", tags=["marketplace"])
api_router.include_router(artisans.router, prefix="/artisans", tags=["artisans"])
api_router.include_router(transport.router, prefix="/transport", tags=["transport"])
