from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import sqlalchemy_url, supabase_sqlalchemy_url


class Base(DeclarativeBase):
    pass


# Monkeypatch GeoAlchemy2's SQLite DDL event listeners to bypass SpatiaLite requirements on SQLite in test environments.
try:
    import geoalchemy2.admin.dialects.sqlite
    geoalchemy2.admin.dialects.sqlite.after_create = lambda *args, **kwargs: None
    geoalchemy2.admin.dialects.sqlite.before_create = lambda *args, **kwargs: None
    
    from sqlalchemy.ext.compiler import compiles
    from geoalchemy2.types import Geometry

    @compiles(Geometry, "sqlite")
    def compile_geometry_sqlite(element, compiler, **kw):
        return "TEXT"
except (ImportError, AttributeError):
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
    eng = engine()
    if eng.dialect.name != "sqlite":
        with eng.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            # Dynamic migration for cluster_participants columns if they are not present
            try:
                conn.execute(text("ALTER TABLE cluster_participants ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'pending'"))
                conn.execute(text("ALTER TABLE cluster_participants ADD COLUMN IF NOT EXISTS share_kobo INTEGER DEFAULT 3000000"))
                conn.execute(text("ALTER TABLE cluster_participants ADD COLUMN IF NOT EXISTS volume_units FLOAT DEFAULT 10.0"))
                conn.commit()
            except Exception as exc:
                print(f"Warning: could not alter cluster_participants table: {exc}")
            conn.commit()
    Base.metadata.create_all(bind=eng)



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


_supabase_engine = None
_SupabaseSessionLocal = None


def supabase_engine():
    global _supabase_engine
    if _supabase_engine is None:
        _supabase_engine = create_engine(supabase_sqlalchemy_url(), pool_pre_ping=True)
    return _supabase_engine


def SupabaseSessionLocal():
    global _SupabaseSessionLocal
    if _SupabaseSessionLocal is None:
        _SupabaseSessionLocal = sessionmaker(
            bind=supabase_engine(), autocommit=False, autoflush=False, expire_on_commit=False
        )
    return _SupabaseSessionLocal


@contextmanager
def supabase_db_session() -> Iterator[Session]:
    """Session bound to the Supabase Postgres instance, not the local `ventureroot` DB.

    Use this for any raw-SQL query against public.profiles, public.savings_plans,
    public.investments, public.business_clusters, or public.dividend_records —
    those tables are Supabase-only. Requires SUPABASE_DATABASE_URL in the environment.
    """
    db = SupabaseSessionLocal()()
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

