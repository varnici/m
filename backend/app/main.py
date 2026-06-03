from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import logging
import os

from app.middleware.security import register_middleware
from app.routers import inventory, voice, budget_best, savings, logistics, proxy
from app.services.savings_service import start_auto_sweep_scheduler, stop_auto_sweep_scheduler
from app.config import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def _warmup_voice_model():
    """
    Pre-load Whisper + spaCy at startup so the first voice request isn't slow.
    Errors are warned but never fatal — app starts regardless.
    """
    try:
        from app.services import voice_service as voice

        spacy_model = voice.load_spacy()
        chroma_collection = voice.load_chromadb()
        voice.register_models(None, spacy_model, chroma_collection)
        logger.info("Voice parser models loaded successfully")
    except Exception as e:
        logger.warning(
            f"Voice model warmup failed: {e} — "
            "voice transcription may be slow on first request"
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    logger.info("Starting Inventory API...")

    if os.getenv("VOICE_WARMUP", "false").lower() == "true":
        import asyncio

        loop = asyncio.get_event_loop()
        app.state.voice_warmup_future = loop.run_in_executor(None, _warmup_voice_model)

    # Start savings auto-sweep scheduler
    start_auto_sweep_scheduler()

    yield

    stop_auto_sweep_scheduler()
    logger.info("Shutting down Inventory API...")


app = FastAPI(
    title="Inventory API",
    description=(
        "Voice-enabled inventory management system. "
        "Natural language voice input — online via Claude, offline via spaCy."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# Register middleware (CORS, security headers, rate limiting)
register_middleware(app)

# Routers
app.include_router(inventory.router)
app.include_router(voice.router)
app.include_router(budget_best.router)
app.include_router(savings.router)
app.include_router(logistics.router)
app.include_router(proxy.router)  # Proxy to core-banking and other services


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check — includes voice model status."""
    voice_status = "unavailable"
    nlp_status = "unavailable"
    parsing_mode = "none"

    try:
        from app.services import voice_service as voice
        voice_status = "ok" if voice.ML_MODELS.get("whisper") is not None else "unavailable"
    except Exception as e:
        voice_status = f"error: {e}"

    try:
        from app.services import voice_service as voice
        nlp_status = "ok" if voice.ML_MODELS.get("spacy") is not None else "unavailable"
    except Exception as e:
        nlp_status = f"error: {e}"

    try:
        from app.services import voice_service as voice
        parsing_mode = "slm (online)" if voice.ENABLE_SLM else "spacy (offline)"
    except Exception:
        parsing_mode = "unknown"

    return {
        "status": "ok",
        "service": "inventory-api",
        "voice": {
            "transcription": voice_status,
            "nlp": nlp_status,
            "parsing_mode": parsing_mode,
        },
    }


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    logger.warning(f"Validation error: {exc}")
    return JSONResponse(
        status_code=422,
        content={"detail": "Invalid request data", "errors": exc.errors()},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unexpected error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8080,
        reload=not settings.is_production,
    )
