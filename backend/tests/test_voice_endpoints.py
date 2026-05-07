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
    monkeypatch.setattr(voice_service, "transcribe_bytes", lambda *_: "sold twenty units")
    files = {"file": ("test.wav", io.BytesIO(b"fake-wav"), "audio/wav")}
    response = client.post("/voice/transcribe", files=files)
    assert response.status_code == 200
    payload = response.json()
    assert payload["text"] == "sold twenty units"
    assert payload["extracted_number"] == "20"
    assert payload["field_type"] == "number"


def test_voice_transcribe_accepts_audio_filename_without_mime(monkeypatch):
    """Accepts files that have audio extension even if MIME is generic."""
    monkeypatch.setattr(voice_service, "transcribe_bytes", lambda *_: "quantity 15")
    files = {"file": ("voice-input.wav", io.BytesIO(b"fake-wav"), "application/octet-stream")}
    response = client.post("/voice/transcribe", files=files)
    assert response.status_code == 200
    assert response.json()["extracted_number"] == "15"
