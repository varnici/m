from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    env: str = "dev"
    log_level: str = "info"
    openai_api_key: str = "sk-placeholder"
    google_api_key: str = "placeholder"

    class Config:
        env_prefix = "AI_ML_"
        case_sensitive = False


settings = Settings()

