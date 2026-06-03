"""
VentureRoot — KYC Service
Integrates: Smile Identity (BVN/NIN/biometric), Dojah (employer data)
CBN-compliant identity verification pipeline.
"""

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from enum import Enum
from typing import Optional
import httpx
import base64

from .core.config import settings

app = FastAPI(title="VentureRoot KYC Service", version="1.0.0")


# ── Schemas ───────────────────────────────────────────────────────────────────

class KycStatusResponse(BaseModel):
    phone_verified:     bool
    bvn_verified:       bool
    nin_verified:       bool
    biometric_verified: bool
    employer_verified:  bool
    overall_status:     str   # 'pending' | 'partial' | 'complete' | 'rejected'
    confidence_score:   float # 0.0 – 1.0

class BvnVerifyRequest(BaseModel):
    bvn: str
    dob: str  # YYYY-MM-DD

class NinVerifyRequest(BaseModel):
    nin: str

class BiometricRequest(BaseModel):
    selfie_base64: str  # liveness selfie from React Native camera

class EmployerVerifyRequest(BaseModel):
    employer_letter: Optional[str] = None   # base64 PDF
    payroll_account_id: Optional[str] = None  # open banking account ID


# ── Confidence thresholds (from platform spec) ────────────────────────────────
AUTO_PASS_THRESHOLD    = 0.80
MANUAL_REVIEW_LOW      = 0.70
MANUAL_REVIEW_HIGH     = 0.80
# Below MANUAL_REVIEW_LOW → auto fail, ask user to redo


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/kyc/{user_id}/status", response_model=KycStatusResponse)
async def get_kyc_status(user_id: str):
    # Load from database
    status = await _load_kyc_record(user_id)
    return _build_status_response(status)


@app.post("/kyc/{user_id}/bvn", response_model=KycStatusResponse)
async def verify_bvn(user_id: str, payload: BvnVerifyRequest):
    """
    Queries Smile Identity BVN verification API.
    Returns match confidence between submitted details and BVN record.
    """
    result = await _smile_verify_bvn(payload.bvn, payload.dob)

    confidence = result.get("confidence", 0.0)
    passed     = confidence >= AUTO_PASS_THRESHOLD

    if not passed and confidence < MANUAL_REVIEW_LOW:
        raise HTTPException(400, "BVN details do not match our records. Please check your BVN and date of birth.")

    await _update_kyc_field(user_id, "bvn_verified", passed, confidence)

    status = await _load_kyc_record(user_id)
    return _build_status_response(status)


@app.post("/kyc/{user_id}/nin", response_model=KycStatusResponse)
async def verify_nin(user_id: str, payload: NinVerifyRequest):
    """
    Queries Dojah NIN verification API.
    NIN match requires name + DOB + photo match ≥ 85% confidence.
    """
    result = await _dojah_verify_nin(payload.nin)

    confidence = result.get("confidence", 0.0)
    passed     = confidence >= 0.85  # stricter threshold for NIN per spec

    if not passed:
        raise HTTPException(400, "NIN verification failed. Please ensure your NIN is correct.")

    # Store extracted identity fields for cross-matching
    await _update_kyc_field(user_id, "nin_verified", passed, confidence, metadata={
        "nin_name":  result.get("full_name"),
        "nin_dob":   result.get("date_of_birth"),
        "nin_photo": result.get("photo_base64"),
    })

    status = await _load_kyc_record(user_id)
    return _build_status_response(status)


@app.post("/kyc/{user_id}/biometric", response_model=KycStatusResponse)
async def verify_biometric(user_id: str, payload: BiometricRequest):
    """
    Liveness check: blink, smile, head turn — prevents static photo fraud.
    Selfie compared against NIN/BVN database photo using Smile Identity.

    Confidence thresholds:
      ≥ 0.80 → auto pass
      0.70–0.79 → ask to redo once
      < 0.70 → manual review flag
    """
    nin_photo = await _get_stored_nin_photo(user_id)
    if not nin_photo:
        raise HTTPException(400, "Please complete NIN verification before biometric check.")

    result = await _smile_liveness_match(
        selfie_base64=payload.selfie_base64,
        reference_photo_base64=nin_photo,
    )

    confidence    = result.get("confidence", 0.0)
    liveness_pass = result.get("liveness_passed", False)

    if not liveness_pass:
        raise HTTPException(400, "Liveness check failed. Please ensure you are in a well-lit area and follow the on-screen instructions.")

    if confidence < MANUAL_REVIEW_LOW:
        # Flag for manual review
        await _flag_for_manual_review(user_id, "biometric", confidence, payload.selfie_base64)
        raise HTTPException(422, "Identity verification requires manual review. We will notify you within 24 hours.")

    passed = confidence >= AUTO_PASS_THRESHOLD

    if not passed:
        # Between 0.70–0.79: allow one retry
        raise HTTPException(400, "Selfie match was not clear enough. Please retake in better lighting.")

    await _update_kyc_field(user_id, "biometric_verified", True, confidence)

    status = await _load_kyc_record(user_id)
    return _build_status_response(status)


@app.post("/kyc/{user_id}/employer")
async def verify_employer(user_id: str, payload: EmployerVerifyRequest):
    """
    Employer verification for 9-to-5 users.
    Priority: payroll API > employer letter > manual review.
    Bank/govt/multinational score highest for credit purposes.
    """
    result = {"verified": False, "employer_name": "", "monthly_salary": 0.0, "employer_tier": "unverified"}

    if payload.payroll_account_id:
        # Open banking salary verification (Mono/Okra)
        result = await _verify_via_open_banking(user_id, payload.payroll_account_id)
    elif payload.employer_letter:
        # Document OCR verification (Smile Identity Doc Verification)
        result = await _verify_employer_letter(payload.employer_letter)

    if not result["verified"]:
        # Flag for manual operations review
        await _flag_for_manual_review(user_id, "employer", 0.0)
        return {"verified": False, "message": "Employer verification submitted for review. We will notify you within 48 hours."}

    await _update_kyc_field(user_id, "employer_verified", True, 1.0, metadata=result)

    return {
        "verified": True,
        "employer_name": result["employer_name"],
        "monthly_salary": result["monthly_salary"],
    }


# ── Internal helpers (stubs — implement with actual SDK calls) ────────────────

async def _smile_verify_bvn(bvn: str, dob: str) -> dict:
    """Smile Identity BVN verification."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.SMILE_IDENTITY_URL}/bvn",
            json={"bvn": bvn, "dob": dob},
            headers={"Authorization": f"Bearer {settings.SMILE_IDENTITY_KEY}"},
            timeout=10,
        )
    return resp.json()

async def _dojah_verify_nin(nin: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.DOJAH_URL}/nin",
            params={"nin": nin},
            headers={"Authorization": f"Bearer {settings.DOJAH_KEY}"},
            timeout=10,
        )
    return resp.json()

async def _smile_liveness_match(selfie_base64: str, reference_photo_base64: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.SMILE_IDENTITY_URL}/liveness",
            json={"selfie": selfie_base64, "reference": reference_photo_base64},
            headers={"Authorization": f"Bearer {settings.SMILE_IDENTITY_KEY}"},
            timeout=15,
        )
    return resp.json()

async def _verify_via_open_banking(user_id: str, account_id: str) -> dict:
    """Mono/Okra: detect recurring salary credits, identify employer."""
    ...

async def _verify_employer_letter(letter_base64: str) -> dict:
    """OCR + NLP on employer letterhead."""
    ...

async def _load_kyc_record(user_id: str) -> dict: ...
async def _update_kyc_field(user_id: str, field: str, value: bool, confidence: float, metadata: dict = None): ...
async def _get_stored_nin_photo(user_id: str) -> Optional[str]: ...
async def _flag_for_manual_review(user_id: str, check_type: str, confidence: float, data: str = None): ...

def _build_status_response(record: dict) -> KycStatusResponse:
    fields = ["phone_verified", "bvn_verified", "nin_verified", "biometric_verified", "employer_verified"]
    verified_count = sum(1 for f in fields if record.get(f, False))
    overall = (
        "complete" if verified_count == len(fields) else
        "partial"  if verified_count >= 3 else
        "rejected" if record.get("is_rejected") else
        "pending"
    )
    return KycStatusResponse(
        phone_verified=record.get("phone_verified", False),
        bvn_verified=record.get("bvn_verified", False),
        nin_verified=record.get("nin_verified", False),
        biometric_verified=record.get("biometric_verified", False),
        employer_verified=record.get("employer_verified", False),
        overall_status=overall,
        confidence_score=record.get("overall_confidence", 0.0),
    )