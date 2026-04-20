from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import sqlalchemy_url


class Base(DeclarativeBase):
    pass


_engine = None
_SessionLocal = None


def engine():
    global _engine
    if _engine is None:
        url = sqlalchemy_url()
        if url.startswith("sqlite") and ":memory:" in url:
            _engine = create_engine(
                url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
                pool_pre_ping=True,
            )
        else:
            _engine = create_engine(url, pool_pre_ping=True)
    return _engine


def SessionLocal():
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=engine(), autocommit=False, autoflush=False, expire_on_commit=False)
    return _SessionLocal


def init_db() -> None:
    # Alembic is the real migration tool. This is a dev convenience only.
    with engine().connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        conn.commit()
    Base.metadata.create_all(bind=engine())


@contextmanager
def db_session() -> Iterator[Session]:
    db = SessionLocal()()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_db() -> Iterator[Session]:
    db = SessionLocal()()
    try:
        yield db
    finally:
        db.close()

