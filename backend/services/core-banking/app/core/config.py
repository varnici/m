from __future__ import annotations

import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    env: str = "dev"
    log_level: str = "info"

    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "ventureroot"
    postgres_user: str = "ventureroot"
    postgres_password: str = "ventureroot"

    redis_url: str = "redis://localhost:6379/0"
    inventory_domain_enabled: bool = True
    inventory_domain_enforce: bool = True
    inventory_domain_outbox_topic: str = "inventory"
    inventory_outbox_batch_size: int = 100
    inventory_outbox_publisher: str = "log"

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

