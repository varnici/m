"""
Dynamic multi-party onboarding engine.

Each user type follows a different step sequence with different
data requirements and verification checks.

Prefix: /v1/onboarding
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.infrastructure.auth import get_current_user_id
from app.infrastructure.database import db_session
from app.models.onboarding import (
    DistributorProfile,
    LogisticsPartnerProfile,
    MerchantProfile,
    OnboardingProfile,
)
from app.models.user import User
from app.services.kyc_service import get_kyc_provider

router = APIRouter()

# ---------------------------------------------------------------------------
# Step definitions per account type
# ---------------------------------------------------------------------------

STEP_SEQUENCES: dict[str, list[str]] = {
    "nine_to_five": [
        "basic_info", "bvn_verify", "nin_verify", "employer_verify", "salary_config",
    ],
    "merchant_sme": [
        "basic_info", "business_info", "gps_location", "store_photos", "bvn_verify",
    ],
    "distributor": [
        "basic_info", "company_info", "cac_verify", "warehouse_location", "bank_details",
    ],
    "logistics": [
        "basic_info", "company_info", "fleet_info", "insurance_verify", "vehicle_docs",
    ],
}

STEP_LABELS: dict[str, str] = {
    "basic_info": "Personal Information",
    "bvn_verify": "BVN Verification",
    "nin_verify": "NIN Verification",
    "employer_verify": "Employer Verification",
    "salary_config": "Salary Configuration",
    "business_info": "Business Information",
    "gps_location": "Store GPS Location",
    "store_photos": "Store Front & Face ID",
    "company_info": "Company Information",
    "cac_verify": "CAC Registry Verification",
    "warehouse_location": "Warehouse Location",
    "bank_details": "Settlement Bank Details",
    "fleet_info": "Fleet Information",
    "insurance_verify": "GIT Insurance Verification",
    "vehicle_docs": "Vehicle Documentation",
}


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class StartOnboardingIn(BaseModel):
    account_type: str


class StepDataIn(BaseModel):
    data: dict[str, Any] = Field(default_factory=dict)


class StepInfo(BaseModel):
    name: str
    label: str
    completed: bool


class OnboardingStatusOut(BaseModel):
    account_type: str
    current_step: str
    current_step_label: str
    is_complete: bool
    steps: list[StepInfo]
    progress_pct: float


class StepResultOut(BaseModel):
    step_completed: str
    next_step: Optional[str]
    is_complete: bool
    message: str
    kyc_verified: Optional[bool] = None
    kyc_message: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_status(profile: OnboardingProfile) -> OnboardingStatusOut:
    seq = STEP_SEQUENCES.get(profile.account_type, [])
    completed_set = set(profile.steps_completed.split(",")) if profile.steps_completed else set()
    steps = [
        StepInfo(
            name=s,
            label=STEP_LABELS.get(s, s),
            completed=s in completed_set,
        )
        for s in seq
    ]
    done_count = sum(1 for s in steps if s.completed)
    total = max(1, len(seq))
    return OnboardingStatusOut(
        account_type=profile.account_type,
        current_step=profile.current_step,
        current_step_label=STEP_LABELS.get(profile.current_step, profile.current_step),
        is_complete=profile.is_complete,
        steps=steps,
        progress_pct=round((done_count / total) * 100, 1),
    )


def _advance_step(db, profile: OnboardingProfile, step_name: str):
    seq = STEP_SEQUENCES.get(profile.account_type, [])
    completed = set(profile.steps_completed.split(",")) if profile.steps_completed else set()
    completed.add(step_name)
    profile.steps_completed = ",".join(sorted(completed))

    current_idx = seq.index(step_name) if step_name in seq else -1
    if current_idx + 1 < len(seq):
        profile.current_step = seq[current_idx + 1]
    else:
        profile.is_complete = True
        profile.current_step = "complete"

    db.flush()


# ---------------------------------------------------------------------------
# POST /onboarding/start
# ---------------------------------------------------------------------------

@router.post("/start", response_model=OnboardingStatusOut)
def start_onboarding(payload: StartOnboardingIn, user_id: str = Depends(get_current_user_id)):
    account_type = payload.account_type
    if account_type not in STEP_SEQUENCES:
        raise HTTPException(status_code=400, detail=f"Unsupported account type: {account_type}")

    with db_session() as db:
        existing = db.execute(
            select(OnboardingProfile).where(OnboardingProfile.user_id == user_id)
        ).scalar_one_or_none()

        if existing:
            return _build_status(existing)

        profile = OnboardingProfile(
            user_id=user_id,
            account_type=account_type,
            current_step=STEP_SEQUENCES[account_type][0],
        )
        db.add(profile)

        if account_type == "merchant_sme":
            db.add(MerchantProfile(user_id=user_id))
        elif account_type == "distributor":
            db.add(DistributorProfile(user_id=user_id))
        elif account_type == "logistics":
            db.add(LogisticsPartnerProfile(user_id=user_id))

        db.flush()
        return _build_status(profile)


# ---------------------------------------------------------------------------
# GET /onboarding/status
# ---------------------------------------------------------------------------

@router.get("/status", response_model=OnboardingStatusOut)
def get_onboarding_status(user_id: str = Depends(get_current_user_id)):
    with db_session() as db:
        profile = db.execute(
            select(OnboardingProfile).where(OnboardingProfile.user_id == user_id)
        ).scalar_one_or_none()

        if not profile:
            raise HTTPException(status_code=404, detail="Onboarding not started")

        return _build_status(profile)


# ---------------------------------------------------------------------------
# POST /onboarding/step/{step_name}
# ---------------------------------------------------------------------------

@router.post("/step/{step_name}", response_model=StepResultOut)
def submit_step(step_name: str, payload: StepDataIn, user_id: str = Depends(get_current_user_id)):
    with db_session() as db:
        profile = db.execute(
            select(OnboardingProfile).where(OnboardingProfile.user_id == user_id)
        ).scalar_one_or_none()

        if not profile:
            raise HTTPException(status_code=404, detail="Onboarding not started")
        if profile.is_complete:
            raise HTTPException(status_code=400, detail="Onboarding already complete")

        seq = STEP_SEQUENCES.get(profile.account_type, [])
        if step_name not in seq:
            raise HTTPException(status_code=400, detail=f"Invalid step '{step_name}' for {profile.account_type}")

        data = payload.data
        kyc_verified: Optional[bool] = None
        kyc_message: Optional[str] = None

        # ── Step handlers ──
        if step_name == "basic_info":
            user = db.get(User, user_id)
            if user:
                if data.get("full_name"):
                    user.full_name = data["full_name"]
                if data.get("email"):
                    user.email = data["email"]
                if data.get("phone"):
                    user.phone = data["phone"]

        elif step_name == "company_info":
            if profile.account_type == "distributor":
                dp = db.execute(
                    select(DistributorProfile).where(DistributorProfile.user_id == user_id)
                ).scalar_one_or_none()
                if dp:
                    dp.company_name = data.get("company_name")
                    dp.cac_reg_number = data.get("cac_reg_number")
                    dp.tin = data.get("tin")
            elif profile.account_type == "logistics":
                lp = db.execute(
                    select(LogisticsPartnerProfile).where(LogisticsPartnerProfile.user_id == user_id)
                ).scalar_one_or_none()
                if lp:
                    lp.company_name = data.get("company_name")

        elif step_name == "business_info":
            mp = db.execute(
                select(MerchantProfile).where(MerchantProfile.user_id == user_id)
            ).scalar_one_or_none()
            if mp:
                mp.business_name = data.get("business_name")
                mp.market_association_id = data.get("market_association_id")
                mp.inventory_category = data.get("inventory_category")

        elif step_name == "gps_location":
            mp = db.execute(
                select(MerchantProfile).where(MerchantProfile.user_id == user_id)
            ).scalar_one_or_none()
            if mp:
                mp.gps_lat = data.get("latitude")
                mp.gps_lng = data.get("longitude")
                mp.gps_verified = True

        elif step_name == "store_photos":
            mp = db.execute(
                select(MerchantProfile).where(MerchantProfile.user_id == user_id)
            ).scalar_one_or_none()
            if mp:
                mp.store_front_photo_url = data.get("store_front_photo_url")
                mp.face_id_photo_url = data.get("face_id_photo_url")

        elif step_name == "cac_verify":
            dp = db.execute(
                select(DistributorProfile).where(DistributorProfile.user_id == user_id)
            ).scalar_one_or_none()
            if dp:
                dp.cac_verified = True

        elif step_name == "warehouse_location":
            dp = db.execute(
                select(DistributorProfile).where(DistributorProfile.user_id == user_id)
            ).scalar_one_or_none()
            if dp:
                dp.warehouse_address = data.get("address")
                dp.warehouse_lat = data.get("latitude")
                dp.warehouse_lng = data.get("longitude")

        elif step_name == "bank_details":
            dp = db.execute(
                select(DistributorProfile).where(DistributorProfile.user_id == user_id)
            ).scalar_one_or_none()
            if dp:
                dp.bank_name = data.get("bank_name")
                dp.account_number = data.get("account_number")

        elif step_name == "fleet_info":
            lp = db.execute(
                select(LogisticsPartnerProfile).where(LogisticsPartnerProfile.user_id == user_id)
            ).scalar_one_or_none()
            if lp:
                lp.fleet_size = data.get("fleet_size")
                lp.vehicle_registration_numbers = data.get("vehicle_registration_numbers")
                lp.driver_license_number = data.get("driver_license_number")

        elif step_name == "insurance_verify":
            lp = db.execute(
                select(LogisticsPartnerProfile).where(LogisticsPartnerProfile.user_id == user_id)
            ).scalar_one_or_none()
            if lp:
                lp.insurance_provider = data.get("insurance_provider")
                lp.insurance_policy_number = data.get("insurance_policy_number")
                lp.insurance_verified = True

        elif step_name == "vehicle_docs":
            lp = db.execute(
                select(LogisticsPartnerProfile).where(LogisticsPartnerProfile.user_id == user_id)
            ).scalar_one_or_none()
            if lp:
                lp.vehicle_docs_verified = True

        elif step_name == "bvn_verify":
            # Only meaningful for merchant_sme — nine_to_five's own "bvn_verify"
            # step (a separate step in that sequence) isn't wired to this
            # handler's MerchantProfile lookup and falls through untouched.
            mp = db.execute(
                select(MerchantProfile).where(MerchantProfile.user_id == user_id)
            ).scalar_one_or_none()
            id_number = data.get("id_number")
            selfie_base64 = data.get("selfie_base64")
            if mp and id_number and selfie_base64:
                result = get_kyc_provider().verify_biometric_kyc(
                    selfie_base64=selfie_base64,
                    id_type=data.get("id_type", "NIN"),
                    id_number=id_number,
                    first_name=data.get("first_name"),
                    last_name=data.get("last_name"),
                    dob=data.get("dob"),
                    user_id=user_id,
                )
                mp.verified = result.verified
                mp.kyc_confidence = result.confidence
                mp.kyc_result_message = result.message
                mp.kyc_verified_at = datetime.now(timezone.utc)
                kyc_verified = result.verified
                kyc_message = result.message
            elif mp:
                # "Complete KYC Later" path from KYCVerificationScreen, or no
                # selfie captured — leave verified=False rather than block
                # onboarding completion on it.
                mp.kyc_result_message = "Identity verification skipped — id or selfie not provided."
                kyc_verified = False
                kyc_message = mp.kyc_result_message

        elif step_name in ("nin_verify", "employer_verify", "salary_config"):
            pass

        _advance_step(db, profile, step_name)

        if profile.is_complete:
            user = db.get(User, user_id)
            if user:
                category_map = {
                    "nine_to_five": "nine_to_five",
                    "merchant_sme": "retail",
                    "distributor": "distributor",
                    "logistics": "logistics",
                }
                user.category = category_map.get(profile.account_type, "personal")

        next_step = profile.current_step if not profile.is_complete else None
        return StepResultOut(
            step_completed=step_name,
            next_step=next_step,
            is_complete=profile.is_complete,
            message=f"Step '{step_name}' completed successfully.",
            kyc_verified=kyc_verified,
            kyc_message=kyc_message,
        )
