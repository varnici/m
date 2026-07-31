from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    env: str = "dev"
    log_level: str = "info"
    openai_api_key: str = "sk-placeholder"
    google_api_key: str = "placeholder"

    # ── Groq (open-source model hosting for voice-to-inventory) ──────────
    # Groq's API is OpenAI-SDK-compatible (base_url override), so no separate
    # client library is needed. STT uses Groq's hosted Whisper; structuring
    # is language-routed between two open models: Llama for English/Pidgin,
    # Qwen for Yoruba/Igbo/Hausa, since Qwen has stronger low-resource/
    # multilingual performance. Model ids are settings, not hardcoded,
    # because Groq's catalog of hosted model ids changes over time.
    groq_api_key: str = ""
    groq_whisper_model: str = "whisper-large-v3"
    groq_llama_model: str = "llama-3.3-70b-versatile"
    groq_qwen_model: str = "qwen2.5-72b-instruct"

    class Config:
        env_prefix = "AI_ML_"
        case_sensitive = False


settings = Settings()

