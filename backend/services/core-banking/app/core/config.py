from __future__ import annotations

import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    env: str = "dev"
    log_level: str = "info"

    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_db: str = "ventureroot"
    postgres_user: str = "ventureroot"
    postgres_password: str = "ventureroot"

    redis_url: str = "redis://redis:6379/0"

    class Config:
        env_prefix = ""
        case_sensitive = False


settings = Settings()


def sqlalchemy_url() -> str:
    override = os.getenv("DATABASE_URL")
    if override:
        return override
    return (
        f"postgresql+psycopg2://{settings.postgres_user}:{settings.postgres_password}"
        f"@{settings.postgres_host}:{settings.postgres_port}/{settings.postgres_db}"
    )

