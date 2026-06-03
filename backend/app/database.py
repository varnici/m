"""Database infrastructure for the main backend application."""
import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Load and normalize the database URL for asyncpg
db_url = os.getenv("DATABASE_URL")
if not db_url:
    db_url = "postgresql+asyncpg://ventureroot:ventureroot@localhost:5432/ventureroot"
else:
    # Replace standard/sync postgres prefixes with asyncpg
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif db_url.startswith("postgresql+psycopg2://"):
        db_url = db_url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)

# Create the async database engine
engine = create_async_engine(
    db_url,
    pool_pre_ping=True,
    echo=False,
)

# Create the session maker for AsyncSession
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency to yield an isolated async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
