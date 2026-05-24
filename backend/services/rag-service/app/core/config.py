from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    env: str = "dev"
    log_level: str = "info"
    supabase_url: str = "placeholder"
    supabase_key: str = "placeholder"
    google_api_key: str = "placeholder"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    embedding_provider: str = "hash"
    sentence_transformer_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    vector_store: str = "memory"
    deeplake_path: str = "./data/rag_deeplake"
    retrieval_top_k: int = 8
    graph_top_k: int = 8
    max_context_chars: int = 12000
    allow_stub_llm: bool = True

    class Config:
        env_prefix = "RAG_"
        case_sensitive = False


settings = Settings()
