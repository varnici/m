from __future__ import annotations

import json
import os

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    env: str = "dev"
    log_level: str = "info"

    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_db_url: str = ""
    api_secret_key: str = "dev_api_secret"

    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "ventureroot"
    postgres_user: str = "ventureroot"
    postgres_password: str = "ventureroot"

    redis_url: str = "redis://localhost:6379/0"

    # ── ai-ml-service (voice-to-inventory transcription + structuring) ────
    ai_ml_service_url: str = "http://ai-ml-service:8002"
    ai_ml_service_timeout_seconds: float = 30.0

    inventory_domain_enabled: bool = True
    inventory_domain_enforce: bool = True
    inventory_domain_outbox_topic: str = "inventory"
    inventory_outbox_batch_size: int = 100
    inventory_outbox_publisher: str = "log"

    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:19006",
            "http://localhost:8081",
        ]
    )
    cors_allow_credentials: bool = True

    auth_auto_sync_users: bool = True

    jwt_secret: str = "dev_secret_only_for_local_use"
    jwt_algorithm: str = "HS256"

    # ── SMS provider ──────────────────────────────────────────────
    sms_provider: str = "mock"          # 'mock' | 'termii'

    # ── Termii (Nigerian SMS provider) ────────────────────────────
    termii_api_key: str = ""
    termii_sender_id: str = "N-Alert"   # generic sender approved for all NG numbers
    termii_channel: str = "generic"     # 'generic' works without DND approval
    termii_base_url: str = "https://api.ng.termii.com/api"

    # ── Email (OTP & notifications) ───────────────────────────────
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_name: str = "VentureRoot"
    smtp_from_email: str = "noreply@ventureroot.com"

    # ── OTP policy ────────────────────────────────────────────────
    otp_expiry_minutes: int = 10
    otp_max_per_window: int = 3       # max sends per target per 10-min window
    otp_max_verify_attempts: int = 5  # failed verify attempts before OTP is voided

    # ── Platform financials (for breakeven calc) ──────────────────
    platform_fee_rate: float = 0.003   # 0.3%
    monthly_operating_cost_ngn: float = 150_000.0
    drp_reserve_rate: float = 0.01     # 1% monthly reserve deducted from merchant interest

    # ── Worker module security ─────────────────────────────────────
    # No defaults on purpose — endpoints must fail closed (503) rather than
    # accept a guessable committed default when these are unset.
    payment_webhook_secret: str = ""
    worker_cron_secret: str = ""

    # ── Smile Identity (BVN/NIN-linked biometric KYC) ────────────────
    # No defaults on purpose — kyc_service must fail closed rather than
    # silently call Smile Identity's sandbox with a guessable default.
    smile_identity_partner_id: str = ""
    smile_identity_api_key: str = ""
    smile_identity_env: str = "sandbox"   # 'sandbox' | 'production'

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return []
            if raw.startswith("["):
                return json.loads(raw)
            return [origin.strip() for origin in raw.split(",") if origin.strip()]
        return value

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


def supabase_sqlalchemy_url() -> str:
    """Connection string for the Supabase-hosted Postgres instance.

    worker_module.py reads/writes public.profiles, public.savings_plans,
    public.investments, public.business_clusters, and public.dividend_records
    directly via raw SQL — those tables live only in Supabase, not in the
    local `ventureroot` Postgres this service otherwise uses. Without
    SUPABASE_DATABASE_URL set, those queries silently fail against the wrong
    database and every worker dashboard renders empty.
    """
    override = os.getenv("SUPABASE_DATABASE_URL") or settings.supabase_db_url
    if override:
        return override
    return sqlalchemy_url()
