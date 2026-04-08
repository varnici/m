from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    env: str = "dev"
    log_level: str = "info"
    supabase_url: str = "placeholder"
    supabase_key: str = "placeholder"
    google_api_key: str = "placeholder"

    class Config:
        env_prefix = "RAG_"
        case_sensitive = False


settings = Settings()

