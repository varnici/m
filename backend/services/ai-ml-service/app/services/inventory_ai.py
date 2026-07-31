import json
import logging
import os
import tempfile
from typing import List, Optional

from pydantic import BaseModel
from openai import OpenAI
import google.generativeai as genai

from app.core.config import settings
from app.services.multilingual_parser import parse_transcript

logger = logging.getLogger(__name__)

# Voice-to-inventory (STT + structuring) runs on Groq, which hosts open-source
# models (Whisper, Llama, Qwen) behind a fast, OpenAI-SDK-compatible API — so
# we reuse the `openai` package already in requirements.txt with base_url
# pointed at Groq instead of adding a separate client library. Vision (shelf
# scan) is unrelated and stays on Gemini.
groq_client = OpenAI(api_key=settings.groq_api_key, base_url="https://api.groq.com/openai/v1")
genai.configure(api_key=settings.google_api_key)

# Whisper's language hint codes. Nigerian Pidgin has no distinct Whisper code
# (it's English-lexified) so we hint "en"; Igbo isn't reliably in Whisper's
# supported-language set so we omit the hint and let it auto-detect instead
# of forcing a code it doesn't understand.
WHISPER_LANGUAGE_HINTS = {
    "en": "en",
    "pcm": "en",
    "yo": "yo",
    "ig": None,
    "ha": "ha",
}

# Structuring is language-routed rather than run through one model for every
# request: Llama is the faster/cheaper general-purpose choice for
# English/Pidgin, Qwen has stronger low-resource/multilingual performance and
# handles Yoruba/Igbo/Hausa better in practice.
LLAMA_LANGUAGES = {"en", "pcm"}
QWEN_LANGUAGES = {"yo", "ig", "ha"}

STRUCTURING_SYSTEM_PROMPT = """You extract structured inventory data from a shopkeeper's spoken \
transcript. The speaker may use English, Nigerian Pidgin, Yoruba, Igbo, or Hausa, and may mix \
languages mid-sentence. Naira amounts may use "k" (thousand) or "m" (million) shorthand.

Return ONLY a JSON object with these fields (use null when not mentioned):
{
  "product_name": string or null,
  "quantity": integer or null,
  "cost_price_kobo": integer or null,   // price the shop paid, in kobo (naira * 100)
  "selling_price_kobo": integer or null, // price the shop sells at, in kobo
  "movement_type": "sale" or "purchase" or null  // "sale" = stock leaving, "purchase" = stock arriving
}"""


class ProductEntry(BaseModel):
    name: str
    quantity: Optional[int] = None
    unit: Optional[str] = None
    cost_price_kobo: Optional[int] = None
    selling_price_kobo: Optional[int] = None
    movement_type: Optional[str] = None
    category: Optional[str] = None
    raw_text: Optional[str] = None


class TranscriptionResponse(BaseModel):
    text: str
    processed_items: List[ProductEntry]
    confidence: float
    language: str = "en"
    source: str = "regex"  # "groq-llama" | "groq-qwen" | "regex" | "error"


class VisionScanResponse(BaseModel):
    detected_items: List[ProductEntry]
    scene_description: str
    suggested_categories: List[str]


def _model_for_language(language: str) -> tuple[str, str]:
    """Returns (model_id, source_label) for the language-routed structuring call."""
    if language in QWEN_LANGUAGES:
        return settings.groq_qwen_model, "groq-qwen"
    return settings.groq_llama_model, "groq-llama"


def _structure_with_groq(transcript: str, language: str) -> tuple[Optional[ProductEntry], str]:
    if not settings.groq_api_key:
        return None, "regex"
    model_id, source = _model_for_language(language)
    try:
        completion = groq_client.chat.completions.create(
            model=model_id,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": STRUCTURING_SYSTEM_PROMPT},
                {"role": "user", "content": f"Language hint: {language}\nTranscript: {transcript}"},
            ],
            temperature=0,
        )
        data = json.loads(completion.choices[0].message.content)
        return ProductEntry(
            name=data.get("product_name") or "Unknown item",
            quantity=data.get("quantity"),
            cost_price_kobo=data.get("cost_price_kobo"),
            selling_price_kobo=data.get("selling_price_kobo"),
            movement_type=data.get("movement_type"),
            raw_text=transcript,
        ), source
    except Exception:
        logger.exception("Groq structuring call (%s) failed; falling back to regex parser", model_id)
        return None, "regex"


def _structure_with_regex(transcript: str, language: str) -> ProductEntry:
    parsed = parse_transcript(transcript, language)
    return ProductEntry(
        name=parsed.product_name or "Unknown item",
        quantity=parsed.quantity,
        cost_price_kobo=parsed.cost_price_kobo,
        selling_price_kobo=parsed.selling_price_kobo,
        movement_type=parsed.movement_type,
        raw_text=transcript,
    )


def transcribe_inventory(audio_data: bytes, language: str = "en") -> TranscriptionResponse:
    """
    Transcribes audio via Groq's hosted Whisper, then structures the transcript
    into inventory fields via a language-routed open model on Groq (Llama for
    English/Pidgin, Qwen for Yoruba/Igbo/Hausa), falling back to a regex/
    keyword parser if structuring fails or no Groq API key is configured.
    """
    whisper_hint = WHISPER_LANGUAGE_HINTS.get(language)
    try:
        # A unique temp file per request — the previous implementation wrote
        # to a fixed "temp_audio.m4a" path, which two concurrent requests
        # would corrupt for each other.
        with tempfile.NamedTemporaryFile(suffix=".m4a", delete=False) as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name

        try:
            with open(tmp_path, "rb") as audio_file:
                kwargs = {
                    "model": settings.groq_whisper_model,
                    "file": audio_file,
                    "response_format": "text",
                }
                if whisper_hint:
                    kwargs["language"] = whisper_hint
                transcript = groq_client.audio.transcriptions.create(**kwargs)
        finally:
            os.remove(tmp_path)

        transcript_text = str(transcript).strip()

        item, source = _structure_with_groq(transcript_text, language)
        if item is None:
            item = _structure_with_regex(transcript_text, language)

        return TranscriptionResponse(
            text=transcript_text,
            processed_items=[item],
            confidence=0.9 if source.startswith("groq") else 0.55,
            language=language,
            source=source,
        )
    except Exception as e:
        logger.exception("Voice transcription failed")
        return TranscriptionResponse(
            text=f"Error: {str(e)}", processed_items=[], confidence=0.0,
            language=language, source="error",
        )


def scan_shelf_vision(image_data: bytes) -> VisionScanResponse:
    """
    Analyzes shelf images using Gemini 1.5 Flash to extract SKUs and quantities.
    """
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')

        prompt = """
        Analyze this retail shelf image.
        List all visible products, their estimated quantities, and categories.
        Respond with ONLY a JSON object: {"items": [{"name": str, "quantity": int, "category": str}],
        "scene_description": str, "suggested_categories": [str]}
        """

        image_part = {
            "mime_type": "image/jpeg",
            "data": image_data
        }

        response = model.generate_content([prompt, image_part])

        try:
            raw = response.text.strip()
            if raw.startswith("```"):
                raw = raw.strip("`")
                raw = raw[4:] if raw.lower().startswith("json") else raw
            data = json.loads(raw)
            items = [
                ProductEntry(
                    name=i.get("name", "Unknown item"),
                    quantity=i.get("quantity"),
                    category=i.get("category"),
                )
                for i in data.get("items", [])
            ]
            return VisionScanResponse(
                detected_items=items,
                scene_description=data.get("scene_description", ""),
                suggested_categories=data.get("suggested_categories", []),
            )
        except (json.JSONDecodeError, AttributeError):
            logger.warning("Gemini vision response was not valid JSON; returning raw text as one item")
            return VisionScanResponse(
                detected_items=[ProductEntry(name="Unparsed shelf scan", raw_text=response.text)],
                scene_description="Could not parse structured items from the vision model's response.",
                suggested_categories=[],
            )
    except Exception as e:
        logger.exception("Shelf vision scan failed")
        return VisionScanResponse(
            detected_items=[],
            scene_description=f"Vision error: {str(e)}",
            suggested_categories=[]
        )
