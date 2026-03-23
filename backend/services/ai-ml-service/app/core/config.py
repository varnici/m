from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    env: str = "dev"
    log_level: str = "info"

    class Config:
        env_prefix = ""
        case_sensitive = False


settings = Settings()

