from fastapi import APIRouter

from app.api.v1.endpoints import loans, sales, users, wallet

api_router = APIRouter()
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(wallet.router, prefix="/wallet", tags=["wallet"])
api_router.include_router(sales.router, prefix="/sales", tags=["sales"])
api_router.include_router(loans.router, prefix="/loans", tags=["loans"])

from fastapi import APIRouter

from app.api.v1.endpoints import loans, sales, users, wallet

api_router = APIRouter()
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(wallet.router, prefix="/wallet", tags=["wallet"])
api_router.include_router(sales.router, prefix="/sales", tags=["sales"])
api_router.include_router(loans.router, prefix="/loans", tags=["loans"])

from fastapi import APIRouter

from app.api.v1.endpoints import loans, sales, users, wallet

api_router = APIRouter()
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(wallet.router, prefix="/wallet", tags=["wallet"])
api_router.include_router(sales.router, prefix="/sales", tags=["sales"])
api_router.include_router(loans.router, prefix="/loans", tags=["loans"])

