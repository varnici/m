"""Tests for voice transcription endpoints."""
from fastapi.testclient import TestClient
import io

from app.main import app
from app.services import voice_service

client = TestClient(app)


def test_health_check():
    """Test that service is healthy."""
    response = client.get("/health")
    assert response.status_code == 200


def test_voice_transcribe_invalid_file_type():
    """Test voice transcription with invalid file type."""
    # Send non-audio file
    files = {"file": ("test.txt", io.BytesIO(b"not audio"), "text/plain")}
    response = client.post("/voice/transcribe", files=files)
    assert response.status_code == 400


def test_voice_transcribe_empty_file():
    """Test voice transcription with empty file."""
    files = {"file": ("test.wav", io.BytesIO(b""), "audio/wav")}
    response = client.post("/voice/transcribe", files=files)
    assert response.status_code == 400


def test_voice_transcribe_missing_file():
    """Test voice transcription without file."""
    response = client.post("/voice/transcribe")
    assert response.status_code == 422


def test_voice_transcribe_response_format(monkeypatch):
    """Test endpoint format with mocked ASR backend."""
    async def mock_process_voice(*_args, **_kwargs):
        return {
            "product_name": "indomie",
            "customer_id": "anon",
            "quantity": 100,
            "pack_quantity": 10,
            "product_cost": 5.0,
            "price": 10.0,
            "sold": 20,
            "_transcript": "sold twenty units",
            "_language": "en",
            "_trace_id": "testtrace",
            "_source": "mock"
        }
    monkeypatch.setattr(voice_service, "process_voice", mock_process_voice)
    files = {"file": ("test.wav", io.BytesIO(b"fake-wav"), "audio/wav")}
    response = client.post("/voice/transcribe", files=files)
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["transcript"] == "sold twenty units"
    assert payload["data"]["sold"] == 20
    assert payload["data"]["product_name"] == "indomie"


def test_voice_transcribe_accepts_audio_filename_without_mime(monkeypatch):
    """Accepts files that have audio extension even if MIME is generic."""
    async def mock_process_voice(*_args, **_kwargs):
        return {
            "product_name": "beans",
            "customer_id": "anon",
            "quantity": 100,
            "pack_quantity": 10,
            "product_cost": 5.0,
            "price": 10.0,
            "sold": 15,
            "_transcript": "quantity 15",
            "_language": "en",
            "_trace_id": "testtrace",
            "_source": "mock"
        }
    monkeypatch.setattr(voice_service, "process_voice", mock_process_voice)
    files = {"file": ("voice-input.wav", io.BytesIO(b"fake-wav"), "application/octet-stream")}
    response = client.post("/voice/transcribe", files=files)
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["sold"] == 15
