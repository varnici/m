"""Application configuration."""
from typing import Any
from functools import lru_cache
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""
    supabase_url: str = "memory://local"
    supabase_service_key: str = "dev-placeholder"

    # API security
    api_secret_key: str = "dev-secret-change-me"
    allowed_origins: list[str] = ["http://localhost:8081", "http://localhost:3000"]
   
   #APP
    environment: str = "development"
    debug: bool = True
    log_level: str = "info"
    
    
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        extra="ignore")
    
    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug_flag(cls, value: Any) -> Any:
        """Accept deployment labels accidentally passed as DEBUG values."""
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "production", "prod"}:
                return False
            if normalized in {"development", "dev"}:
                return True
        return value


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()  # type: ignore[call-arg]
