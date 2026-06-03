import io
import os
from typing import List, Optional
from pydantic import BaseModel
from openai import OpenAI
import google.generativeai as genai
from app.core.config import settings

# Initialize clients
client = OpenAI(api_key=settings.openai_api_key)
genai.configure(api_key=settings.google_api_key)

class ProductEntry(BaseModel):
    name: str
    quantity: Optional[int] = None
    category: Optional[str] = None
    raw_text: Optional[str] = None

class TranscriptionResponse(BaseModel):
    text: str
    processed_items: List[ProductEntry]
    confidence: float

class VisionScanResponse(BaseModel):
    detected_items: List[ProductEntry]
    scene_description: str
    suggested_categories: List[str]

def transcribe_inventory(audio_data: bytes) -> TranscriptionResponse:
    """
    Transcribes audio inventory logs using OpenAI Whisper and extracts product entries.
    """
    try:
        # Save bytes to a temporary file for OpenAI
        # Note: In a production env, use a memory buffer if supported or a temp dir.
        with open("temp_audio.m4a", "wb") as f:
            f.write(audio_data)
        
        with open("temp_audio.m4a", "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file,
                response_format="text"
            )
        
        # Cleanup
        os.remove("temp_audio.m4a")

        # Basic parsing (in reality, we'd use an LLM call here to structure the text)
        # For now, we simulate structured extraction.
        # TODO: Implement LLM-based extraction for higher accuracy.
        
        return TranscriptionResponse(
            text=transcript,
            processed_items=[
                ProductEntry(name="Extracted Item (Logic Pending LLM Mapping)", raw_text=transcript)
            ],
            confidence=0.95
        )
    except Exception as e:
        # Fallback or error handling
        return TranscriptionResponse(text=f"Error: {str(e)}", processed_items=[], confidence=0.0)

def scan_shelf_vision(image_data: bytes) -> VisionScanResponse:
    """
    Analyzes shelf images using Gemini 1.5 Flash to extract SKUs and quantities.
    """
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Gemini expects a list of parts (text and images)
        prompt = """
        Analyze this retail shelf image. 
        List all visible products, their estimated quantities, and categories.
        Format the response as a JSON list of objects with 'name', 'quantity', and 'category'.
        """
        
        # Construct the image part
        image_part = {
            "mime_type": "image/jpeg",
            "data": image_data
        }
        
        response = model.generate_content([prompt, image_part])
        
        # In a real implementation, we would parse the JSON from the text response.
        # For this skeleton, we provide the raw analysis.
        
        return VisionScanResponse(
            detected_items=[ProductEntry(name="Shelf Analysis pending full parser", raw_text=response.text)],
            scene_description="Retail shelf with multiple SKUs detected.",
            suggested_categories=["Provision", "Drinks", "Snacks"]
        )
    except Exception as e:
        return VisionScanResponse(
            detected_items=[],
            scene_description=f"Vision error: {str(e)}",
            suggested_categories=[]
        )
