"""
VentureRoot — Health & Pharmaceutical Service
NAFDAC verification, PCN registration, OTC-only enforcement,
cold chain tracking, medication reminders, PMD features.

ABSOLUTE REGULATORY LINE: No prescription drugs in any distribution flow.
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime, timedelta
import httpx

from .core.config import settings

app = FastAPI(title="VentureRoot Health & Pharma Service", version="1.0.0")

# ── Prescription-only drug category codes (NAFDAC classification) ─────────────
# These MUST NEVER appear in any business user's OTC catalogue.
PRESCRIPTION_ONLY_CATEGORIES = {
    "antibiotics",
    "antiretrovirals",
    "antihypertensives",
    "controlled_substances",
    "chemotherapy",
    "antiepileptics",
    "schedule_only_medicines",
}

# ── Expiry enforcement windows ────────────────────────────────────────────────
CATALOGUE_REMOVAL_DAYS = 60   # remove from active catalogue 60 days before expiry
ALERT_DAYS_BEFORE_EXPIRY = 90 # send alert to business owner 90 days before


# ── Schemas ───────────────────────────────────────────────────────────────────

class NafdacVerifyResponse(BaseModel):
    nafdac_number: str
    product_name: str
    manufacturer: str
    category: str
    registration_status: str  # 'valid' | 'expired' | 'revoked' | 'not_found'
    expiry_date: Optional[str]
    approved_indications: Optional[str]
    is_prescription_only: bool
    verified_at: str
    can_be_listed_by_pmd: bool  # True only if OTC and valid

class PcnVerifyResponse(BaseModel):
    valid: bool
    dealer_name: str
    license_type: str   # 'patent_medicine_dealer' | 'community_pharmacist'
    license_number: str
    expiry_date: str
    can_access_rx_supply: bool   # True only for community_pharmacist


# ── NAFDAC Verification ───────────────────────────────────────────────────────

@app.get("/health/nafdac/verify/{nafdac_number}", response_model=NafdacVerifyResponse)
async def verify_nafdac(nafdac_number: str):
    """
    Real-time NAFDAC registry lookup.
    Returns product details and whether it can be sold OTC by a PMD.

    CRITICAL: Any product with is_prescription_only=True is BLOCKED from
    all non-pharmacist user catalogues at the database level.
    """
    result = await _query_nafdac_api(nafdac_number)

    if not result:
        return NafdacVerifyResponse(
            nafdac_number=nafdac_number,
            product_name="Unknown",
            manufacturer="Unknown",
            category="unknown",
            registration_status="not_found",
            expiry_date=None,
            approved_indications=None,
            is_prescription_only=False,
            verified_at=datetime.utcnow().isoformat(),
            can_be_listed_by_pmd=False,
        )

    is_rx = result.get("category", "").lower() in PRESCRIPTION_ONLY_CATEGORIES
    is_valid = result.get("status") == "active"

    # Check expiry
    expiry_str = result.get("expiry_date")
    if expiry_str:
        expiry = datetime.strptime(expiry_str, "%Y-%m-%d")
        days_to_expiry = (expiry - datetime.utcnow()).days
        if days_to_expiry <= CATALOGUE_REMOVAL_DAYS:
            is_valid = False  # Too close to expiry — not listable

    return NafdacVerifyResponse(
        nafdac_number=nafdac_number,
        product_name=result.get("product_name", ""),
        manufacturer=result.get("manufacturer", ""),
        category=result.get("category", ""),
        registration_status=result.get("status", "not_found"),
        expiry_date=expiry_str,
        approved_indications=result.get("approved_indications"),
        is_prescription_only=is_rx,
        verified_at=datetime.utcnow().isoformat(),
        can_be_listed_by_pmd=is_valid and not is_rx,
    )


@app.post("/health/nafdac/scan")
async def scan_product_nafdac(payload: dict):
    """
    Consumer drug scan — scans packaging image for NAFDAC number,
    then verifies against registry. FREE for all users including unregistered.
    Also generates aggregate scan intelligence data for DaaS revenue stream.
    """
    image_base64 = payload.get("image_base64")
    if not image_base64:
        raise HTTPException(400, "image_base64 required")

    # Step 1: Extract NAFDAC number from packaging via OCR
    nafdac_number = await _extract_nafdac_from_image(image_base64)

    if not nafdac_number:
        return {
            "status": "unverified",
            "message": "Could not read NAFDAC number from image. Try better lighting or a clearer angle.",
            "nafdac_number": None,
        }

    # Step 2: Verify against registry
    verification = await verify_nafdac(nafdac_number)

    # Step 3: Log scan event for DaaS (anonymised — no user ID stored)
    await _log_scan_event(nafdac_number, verification.registration_status)

    # Step 4: Build consumer-friendly response
    if verification.registration_status == "valid":
        return {
            "status": "genuine",
            "message": "✅ This product is registered and genuine.",
            "product_name": verification.product_name,
            "manufacturer": verification.manufacturer,
            "nafdac_number": nafdac_number,
            "registration_status": verification.registration_status,
            "is_prescription_only": verification.is_prescription_only,
            "prescription_warning": (
                "⚠️ This is a prescription-only medicine. Please consult a doctor before use."
                if verification.is_prescription_only else None
            ),
        }
    else:
        return {
            "status": "unverified",
            "message": "⛔ This product could not be verified. Do NOT use — report to NAFDAC.",
            "nafdac_number": nafdac_number,
            "registration_status": verification.registration_status,
            "report_url": "https://nafdac.gov.ng/report",
        }


# ── PCN Verification ──────────────────────────────────────────────────────────

@app.post("/health/pcn/verify", response_model=PcnVerifyResponse)
async def verify_pcn_registration(payload: dict):
    """
    Verifies PCN (Pharmacy Council of Nigeria) registration.

    CRITICAL: Only PCN-verified users can access the pharmaceutical catalogue.
    Only community_pharmacist license type can access prescription supply.
    """
    pcn_number = payload.get("pcn_number")
    if not pcn_number:
        raise HTTPException(400, "pcn_number required")

    result = await _query_pcn_api(pcn_number)

    if not result or not result.get("active"):
        raise HTTPException(400, f"PCN registration {pcn_number} is not active or was not found.")

    license_type = result.get("license_type", "patent_medicine_dealer")

    return PcnVerifyResponse(
        valid=True,
        dealer_name=result.get("name", ""),
        license_type=license_type,
        license_number=pcn_number,
        expiry_date=result.get("expiry_date", ""),
        can_access_rx_supply=(license_type == "community_pharmacist"),
    )


# ── Medication Refill Reminders ───────────────────────────────────────────────

@app.post("/health/reminders")
async def set_medication_reminder(payload: dict, background_tasks: BackgroundTasks):
    """
    Calculates refill date based on daily dose and current stock.
    Sends refill reminder 7 days before runout.
    """
    sku       = payload.get("sku")
    daily_dose = payload.get("daily_dose", 1)
    current_qty = payload.get("current_qty", 0)
    user_id   = payload.get("user_id")

    if not all([sku, daily_dose, current_qty, user_id]):
        raise HTTPException(400, "sku, daily_dose, current_qty, user_id required")

    days_remaining = current_qty / daily_dose
    refill_date = datetime.utcnow() + timedelta(days=days_remaining - 7)  # 7 days early

    reminder = {
        "user_id": user_id,
        "sku": sku,
        "refill_date": refill_date.date().isoformat(),
        "days_supply_remaining": int(days_remaining),
    }

    background_tasks.add_task(_store_reminder, reminder)
    background_tasks.add_task(_schedule_push_notification, reminder)

    return {
        "reminder_id": f"rem_{user_id}_{sku}",
        "refill_date": refill_date.date().isoformat(),
        "days_supply_remaining": int(days_remaining),
    }


# ── Cold Chain Tracking ───────────────────────────────────────────────────────

@app.post("/health/cold-chain/temperature-log")
async def receive_temperature_log(payload: dict, background_tasks: BackgroundTasks):
    """
    Receives temperature logger data uploaded by cold chain transport provider.
    Any reading outside 2–8°C triggers quarantine alert.
    """
    booking_id = payload.get("booking_id")
    readings   = payload.get("readings", [])  # [{"timestamp": ..., "temp_c": ...}]

    excursions = [r for r in readings if not (2.0 <= r.get("temp_c", 0) <= 8.0)]

    if excursions:
        background_tasks.add_task(_trigger_cold_chain_quarantine, booking_id, excursions)
        return {
            "status": "excursion_detected",
            "message": "Temperature excursion detected. Stock has been quarantined. Do NOT use.",
            "excursion_count": len(excursions),
            "claim_url": f"/insurance/claims/cold-chain/{booking_id}",
        }

    return {"status": "compliant", "message": "Temperature within acceptable range throughout transit."}


# ── Telemedicine Referral ─────────────────────────────────────────────────────

@app.post("/health/telemedicine/refer")
async def get_telemedicine_referral(payload: dict):
    """
    When user scans a prescription drug, redirect to telemedicine.
    Platform earns ₦500–₦2,000 per consultation booked.
    """
    condition = payload.get("condition", "general")

    # Partner priority: Doctoora > MDaaS Global > Helium Health
    provider = await _get_available_telemedicine_provider(condition)

    return {
        "provider_name": provider["name"],
        "url": provider["referral_url"],
        "fee": provider["consultation_fee"],
        "availability": provider["next_slot"],
    }


# ── OTC Catalogue Enforcement ─────────────────────────────────────────────────

@app.get("/health/catalogue/otc")
async def get_otc_catalogue(user_id: str = None):
    """
    Returns only OTC-approved products.
    Prescription-only products are NEVER returned regardless of user or parameters.
    This filter is enforced at the DB query level, not the UI level.
    """
    # In production: query inventory DB with hardcoded WHERE category NOT IN prescription_categories
    # AND nafdac_status = 'valid'
    # AND (expiry_date IS NULL OR expiry_date > NOW() + INTERVAL '60 days')
    catalogue = await _query_otc_catalogue_safe()
    return {"items": catalogue}


# ── Internal helpers ──────────────────────────────────────────────────────────

async def _query_nafdac_api(nafdac_number: str) -> Optional[dict]:
    """NAFDAC public API / web scrape (no official public API exists yet — partner integration needed)."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{settings.NAFDAC_API_URL}/verify/{nafdac_number}",
                headers={"X-API-Key": settings.NAFDAC_API_KEY},
                timeout=8,
            )
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass
    return None

async def _query_pcn_api(pcn_number: str) -> Optional[dict]:
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{settings.PCN_API_URL}/verify/{pcn_number}",
                headers={"X-API-Key": settings.PCN_API_KEY},
                timeout=8,
            )
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass
    return None

async def _extract_nafdac_from_image(image_base64: str) -> Optional[str]: ...
async def _log_scan_event(nafdac_number: str, status: str): ...
async def _store_reminder(reminder: dict): ...
async def _schedule_push_notification(reminder: dict): ...
async def _trigger_cold_chain_quarantine(booking_id: str, excursions: list): ...
async def _get_available_telemedicine_provider(condition: str) -> dict: ...
async def _query_otc_catalogue_safe() -> list: ...