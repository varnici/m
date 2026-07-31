from __future__ import annotations

from fastapi import APIRouter

from app.services.risk_scoring import RiskScoreRequest, RiskScoreResponse, score_risk
from app.services.price_intelligence import PriceIntelRequest, PriceIntelResponse, recommend_price
from app.services.inventory_ai import (
    TranscriptionResponse, 
    VisionScanResponse, 
    transcribe_inventory, 
    scan_shelf_vision
)
from fastapi import File, Form, UploadFile

router = APIRouter()


@router.post("/risk/score", response_model=RiskScoreResponse)
def risk_score(payload: RiskScoreRequest):
    return score_risk(payload)


@router.post("/pricing/recommend", response_model=PriceIntelResponse)
def pricing(payload: PriceIntelRequest):
    return recommend_price(payload)


@router.post("/inventory/transcribe", response_model=TranscriptionResponse)
async def transcribe(file: UploadFile = File(...), language: str = Form("en")):
    content = await file.read()
    return transcribe_inventory(content, language)


@router.post("/inventory/vision-scan", response_model=VisionScanResponse)
async def vision_scan(file: UploadFile = File(...)):
    content = await file.read()
    return scan_shelf_vision(content)

