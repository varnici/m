"""Tests for the Groq-hosted voice-to-inventory pipeline's language routing
and no-key regex fallback. Does not call the real Groq API."""

from app.services.inventory_ai import _model_for_language, _structure_with_groq
from app.core.config import settings


def test_english_and_pidgin_route_to_llama():
    model, source = _model_for_language("en")
    assert model == settings.groq_llama_model
    assert source == "groq-llama"

    model, source = _model_for_language("pcm")
    assert model == settings.groq_llama_model
    assert source == "groq-llama"


def test_yoruba_igbo_hausa_route_to_qwen():
    for lang in ("yo", "ig", "ha"):
        model, source = _model_for_language(lang)
        assert model == settings.groq_qwen_model
        assert source == "groq-qwen"


def test_structuring_falls_back_to_regex_when_no_groq_key_configured():
    assert settings.groq_api_key == ""  # default in this test environment
    item, source = _structure_with_groq("I sold 5 bags of rice", "en")
    assert item is None
    assert source == "regex"
