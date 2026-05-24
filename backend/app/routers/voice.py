"""
voice.py — Production-grade voice inventory router.

Endpoints:
  POST /voice/transcribe        — Upload audio, get inventory JSON (sync, <15s audio)
  POST /voice/transcribe/async  — Upload audio, get job_id immediately (long audio)
  GET  /voice/status/{job_id}   — Poll async job result
  POST /voice/text              — Parse text directly (skip STT, useful for testing)
  POST /voice/catalog           — Add product to RAG catalog
  GET  /voice/catalog/search    — Semantic product search
  GET  /voice/health            — Component health check

Concurrency model:
  - Sync endpoint  → awaits ProcessPool (event loop not blocked)
  - Async endpoint → enqueues Celery task, returns 202 immediately
  - Frontend polls /voice/status/{job_id} until done
"""
import asyncio
import base64
import json
import logging
import os
import re
import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.middleware.security import limiter
from app.services import voice_service as svc

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/voice", tags=["voice"])

CELERY_ENABLED = os.getenv("USE_CELERY", "false").lower() == "true"
REDIS_URL       = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# ---------------------------------------------------------------------------
# CELERY (optional) — lazy init so the app starts fine without Redis
# ---------------------------------------------------------------------------

_celery_app: Optional[Any] = None


def _get_celery():
    global _celery_app
    if _celery_app is None and CELERY_ENABLED:
        try:
            from celery import Celery
            _celery_app = Celery(
                "mapvo_voice",
                broker=REDIS_URL,
                backend=REDIS_URL,
            )
            _celery_app.conf.update(
                task_serializer="json",
                result_serializer="json",
                accept_content=["json"],
                timezone="Africa/Lagos",
                enable_utc=True,
                task_track_started=True,
                task_time_limit=300,
                worker_prefetch_multiplier=1,
            )
            logger.info("Celery initialised")
        except Exception as e:
            logger.warning(f"Celery init failed: {e}")
    return _celery_app


# ---------------------------------------------------------------------------
# RESPONSE SCHEMAS
# ---------------------------------------------------------------------------

class InventoryData(BaseModel):
    product_name:  str
    customer_id:   str
    quantity:      int
    pack_quantity: int
    product_cost:  float
    price:         float
    sold:          int


class VoiceResponse(BaseModel):
    success:    bool
    data:       Optional[InventoryData] = None
    transcript: Optional[str]          = None
    language:   Optional[str]          = None
    job_id:     Optional[str]          = None
    error:      Optional[str]          = None
    trace_id:   str                    = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    source:     Optional[str]          = None


class TextParseRequest(BaseModel):
    text:           str
    prefer_offline: bool = False


class CatalogAddRequest(BaseModel):
    name:     str
    unit:     str = "unit"
    category: str = "general"


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

def _extract_inventory(raw: Dict) -> InventoryData:
    """Strip internal metadata keys (prefixed _) and validate."""
    clean = {k: v for k, v in raw.items() if not k.startswith("_")}
    return InventoryData(**clean)


def _audio_validation(content_type: str, filename: str, size: int):
    """Raise HTTPException if audio file is invalid."""
    ct = content_type.lower()
    is_audio = ct.startswith("audio/")
    has_ext  = filename.lower().endswith(
        (".wav", ".webm", ".ogg", ".mp3", ".mp4", ".m4a", ".aac", ".flac")
    )
    if not (is_audio or has_ext):
        raise HTTPException(400, "File must be an audio format")
    if size == 0:
        raise HTTPException(400, "Empty audio file")
    if size > svc.MAX_AUDIO_MB * 1024 * 1024:
        raise HTTPException(413, f"Audio exceeds {svc.MAX_AUDIO_MB}MB limit")


async def _read_audio_upload(request: Request) -> tuple[bytes, str, str, str, bool]:
    """
    Read an audio upload without requiring FastAPI's multipart dependency at
    route registration time. Supports the simple multipart shape sent by mobile
    clients and tests.
    """
    content_type = request.headers.get("content-type", "")
    body = await request.body()
    if not body:
        raise HTTPException(422, "Audio file is required")

    if "multipart/form-data" not in content_type:
        return body, content_type or "audio/wav", "upload.wav", "anonymous", False

    boundary_match = re.search(r"boundary=([^;]+)", content_type)
    if not boundary_match:
        raise HTTPException(400, "Invalid multipart upload")

    boundary = boundary_match.group(1).strip('"').encode()
    file_content: bytes | None = None
    file_content_type = "application/octet-stream"
    filename = "upload"
    user_id = "anonymous"
    prefer_offline = False

    for raw_part in body.split(b"--" + boundary):
        part = raw_part.strip(b"\r\n")
        if not part or part == b"--" or b"\r\n\r\n" not in part:
            continue
        header_blob, content = part.split(b"\r\n\r\n", 1)
        headers = header_blob.decode("utf-8", errors="ignore")
        content = content.rstrip(b"\r\n")

        name_match = re.search(r'name="([^"]+)"', headers)
        field_name = name_match.group(1) if name_match else ""
        if field_name == "file":
            filename_match = re.search(r'filename="([^"]*)"', headers)
            type_match = re.search(r"Content-Type:\s*([^\r\n]+)", headers, re.IGNORECASE)
            filename = filename_match.group(1) if filename_match else filename
            file_content_type = type_match.group(1).strip() if type_match else file_content_type
            file_content = content
        elif field_name == "user_id":
            user_id = content.decode("utf-8", errors="ignore") or user_id
        elif field_name == "prefer_offline":
            prefer_offline = content.decode("utf-8", errors="ignore").lower() in {"1", "true", "yes"}

    if file_content is None:
        raise HTTPException(422, "Audio file is required")
    return file_content, file_content_type, filename, user_id, prefer_offline


# ---------------------------------------------------------------------------
# SYNC ENDPOINT  — best for audio under ~15 seconds
# ---------------------------------------------------------------------------

@router.post("/transcribe", response_model=VoiceResponse, summary="Transcribe audio and extract inventory (sync)")
@limiter.limit("30/minute")
async def transcribe_sync(
    request: Request,
):
    """
    **Upload audio → get inventory JSON immediately.**

    - Whisper STT runs in a separate process (non-blocking)
    - Parser: SLM → spaCy+RAG → regex fallback
    - Works offline if SLM (Ollama) is not running
    - Rate limited to 30 requests/minute per IP
    """
    content, content_type, filename, user_id, prefer_offline = await _read_audio_upload(request)
    _audio_validation(content_type, filename, len(content))

    try:
        raw = await svc.process_voice(
            content,
            content_type,
            user_id,
            prefer_offline,
        )
        return VoiceResponse(
            success=True,
            data=_extract_inventory(raw),
            transcript=raw.get("_transcript"),
            language=raw.get("_language"),
            trace_id=raw.get("_trace_id", ""),
            source=raw.get("_source"),
        )
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        logger.error(f"Sync transcription failed: {e}", exc_info=True)
        raise HTTPException(500, "Transcription failed — please retry")


@router.post("/transcribe-and-parse", summary="Backward-compatible voice parse response")
@limiter.limit("30/minute")
async def transcribe_and_parse_compat(
    request: Request,
):
    """
    Backward-compatible shape for the React Native voice inventory screen:
    { text, inventory, _source, language }.
    """
    content, content_type, filename, user_id, prefer_offline = await _read_audio_upload(request)
    _audio_validation(content_type, filename, len(content))

    try:
        raw = await svc.process_voice(
            content,
            content_type,
            user_id,
            prefer_offline,
        )
        return {
            "text": raw.get("_transcript", ""),
            "inventory": _extract_inventory(raw).model_dump(mode="json"),
            "_source": raw.get("_source"),
            "language": raw.get("_language"),
        }
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        logger.error(f"Compat transcription failed: {e}", exc_info=True)
        raise HTTPException(500, "Transcription failed — please retry")


# ---------------------------------------------------------------------------
# ASYNC ENDPOINT — best for slow Nigerian 3G connections / long audio
# ---------------------------------------------------------------------------

@router.post(
    "/transcribe/async",
    summary="Enqueue audio processing (returns job_id immediately)",
    status_code=202,
)
@limiter.limit("20/minute")
async def transcribe_async(
    request: Request,
    background_tasks: BackgroundTasks,
):
    """
    **202 Accepted** — returns `job_id` immediately.
    Poll `GET /voice/status/{job_id}` for the result.

    - Uses Celery + Redis when `USE_CELERY=true`
    - Falls back to FastAPI BackgroundTasks if Celery is off
    """
    content, ct, filename, user_id, prefer_offline = await _read_audio_upload(request)
    _audio_validation(ct, filename, len(content))

    job_id = str(uuid.uuid4())

    celery = _get_celery()
    if celery:
        # Encode audio for Celery JSON serialisation
        audio_b64 = base64.b64encode(content).decode()
        celery.send_task(
            "mapvo_voice.process_voice_task",
            args=[audio_b64, ct, user_id, prefer_offline, job_id],
            task_id=job_id,
        )
        logger.info(f"Celery task enqueued: {job_id}")
    else:
        # Fallback: run in FastAPI background (still non-blocking via ProcessPool)
        background_tasks.add_task(
            _bg_process_voice, content, ct, user_id, prefer_offline, job_id
        )
        logger.info(f"Background task started: {job_id}")

    return JSONResponse(
        status_code=202,
        content={
            "success":  True,
            "job_id":   job_id,
            "message":  "Processing started. Poll /voice/status/{job_id} for result.",
            "poll_url": f"/voice/status/{job_id}",
        },
    )


# In-memory job store for fallback (replace with Redis for multi-instance)
_JOB_STORE: Dict[str, Dict] = {}


async def _bg_process_voice(
    audio_bytes: bytes,
    content_type: str,
    user_id: str,
    prefer_offline: bool,
    job_id: str,
):
    """BackgroundTask: run full pipeline and store result in _JOB_STORE."""
    _JOB_STORE[job_id] = {"status": "processing"}
    try:
        raw = await svc.process_voice(audio_bytes, content_type, user_id, prefer_offline)
        _JOB_STORE[job_id] = {
            "status":     "completed",
            "success":    True,
            "data":       {k: v for k, v in raw.items() if not k.startswith("_")},
            "transcript": raw.get("_transcript"),
            "language":   raw.get("_language"),
        }
    except Exception as e:
        logger.error(f"Background job {job_id} failed: {e}")
        _JOB_STORE[job_id] = {
            "status":  "failed",
            "success": False,
            "error":   str(e),
        }


# ---------------------------------------------------------------------------
# JOB STATUS POLLING
# ---------------------------------------------------------------------------

@router.get("/status/{job_id}", summary="Poll async job result")
async def job_status(job_id: str):
    """
    Poll until `status` is `completed` or `failed`.

    Frontend should poll every 1-2 seconds with exponential back-off.
    """
    celery = _get_celery()
    if celery:
        result = celery.AsyncResult(job_id)
        return {
            "job_id": job_id,
            "status": result.status.lower(),
            "result": result.result if result.ready() else None,
        }

    # Fallback: in-memory store
    job = _JOB_STORE.get(job_id)
    if not job:
        raise HTTPException(404, f"Job {job_id} not found")
    return {"job_id": job_id, **job}


# ---------------------------------------------------------------------------
# TEXT PARSING (testing / manual input)
# ---------------------------------------------------------------------------

@router.post("/text", response_model=VoiceResponse, summary="Parse text directly (skip STT)")
@limiter.limit("60/minute")
async def parse_text(request: Request, body: TextParseRequest):
    """
    Skip audio transcription — parse text directly.
    Useful for testing the NLP pipeline without a microphone.

    Accepts Nigerian Pidgin:
    - "I get 50 bags of rice, I buy am 500, I dey sell am 700"
    - "100 units Indomie at 150k, price na 200k"
    """
    if not body.text.strip():
        raise HTTPException(422, "Text cannot be empty")

    trace_id = str(uuid.uuid4())[:8]
    try:
        raw = await svc.parse_inventory_from_transcript(
            body.text, trace_id, body.prefer_offline
        )
        return VoiceResponse(
            success=True,
            data=_extract_inventory(raw),
            transcript=raw.get("_transcript"),
            language=raw.get("_language"),
            trace_id=raw.get("_trace_id", ""),
            source=raw.get("_source"),  
        )
    except Exception as e:
        logger.error(f"Text parse failed [{trace_id}]: {e}")
        raise HTTPException(500, "Parsing failed")


# ---------------------------------------------------------------------------
# CATALOG MANAGEMENT
# ---------------------------------------------------------------------------

@router.post("/catalog", summary="Add product to RAG catalog")
@limiter.limit("20/minute")
async def add_catalog_product(request: Request, body: CatalogAddRequest):
    """Add a custom product to the ChromaDB vector catalog for better recognition."""
    try:
        product_id = svc.add_product_to_catalog(body.name, body.unit, body.category)
        return {"success": True, "product_id": product_id, "name": body.name}
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        raise HTTPException(500, f"Failed to add product: {e}")


@router.get("/catalog/search", summary="Semantic product search")
async def catalog_search(query: str, top_k: int = 5):
    """Search the product catalog using semantic similarity."""
    if not query.strip():
        raise HTTPException(422, "Query cannot be empty")
    try:
        results = svc.search_catalog(query, top_k)
        return {"success": True, "query": query, "results": results}
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        raise HTTPException(500, f"Search failed: {e}")


# ---------------------------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------------------------

@router.get("/health", summary="Component health check")
async def voice_health():
    """Returns status of all voice pipeline components."""
    return {
        "whisper":  "whisper"  in svc.ML_MODELS,
        "spacy":    svc.ML_MODELS.get("spacy") is not None,
        "chromadb": svc.RAG_STORE is not None,
        "celery":   _get_celery() is not None,
        "slm": {
            "enabled": svc.ENABLE_SLM,
            "url":     svc.SLM_URL,
            "model":   svc.SLM_MODEL,
        },
        "config": {
            "whisper_model":   svc.WHISPER_MODEL,
            "whisper_workers": svc.WHISPER_WORKERS,
            "max_audio_mb":    svc.MAX_AUDIO_MB,
            "auto_language":   svc.AUTO_LANGUAGE,
        },
    }
