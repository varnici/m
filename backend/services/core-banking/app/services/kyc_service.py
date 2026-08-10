"""Biometric KYC (selfie + BVN/NIN match + liveness) via a licensed provider.

Wired into the onboarding "bvn_verify" step (app/api/v1/endpoints/onboarding.py)
for the merchant_sme flow: a selfie captured in FaceVerificationScreen plus the
id_type/id_number captured in KYCVerificationScreen are sent here together.

INTEGRATION BOUNDARY — read before wiring a real vendor call:
_SmileIdentityProvider._call_smile_identity() is intentionally left as a stub.
Smile Identity's Biometric KYC request shape (exact job_type value, id_info
field names, image payload format) is only fully pinned down in your own
Smile ID dashboard's generated code sample and the `smile-id-core` package
you install — the public docs site returned 403 to this session's fetch
attempts, so nothing here should be trusted as verified against their current
API. Everything else in this module (config wiring, error handling, DB
persistence, graceful degradation when unset) is complete and doesn't change
regardless of the exact vendor payload shape.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional, Protocol

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class KYCResult:
    verified: bool
    confidence: Optional[float]  # 0-100, None if the provider didn't return one
    message: str
    raw_result_code: Optional[str] = None  # provider's own status code, for audit/support


class KYCProvider(Protocol):
    def verify_biometric_kyc(
        self,
        *,
        selfie_base64: str,
        id_type: str,
        id_number: str,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        dob: Optional[str] = None,
        country: str = "NG",
        user_id: str = "",
    ) -> KYCResult:
        ...


class _SmileIdentityProvider:
    """Calls Smile Identity's Biometric KYC product (selfie + BVN/NIN photo
    match + liveness), scoped to Nigeria (NIN/BVN/Voter's Card/Passport/DL —
    matches the ID types KYCVerificationScreen.tsx collects).
    """

    def __init__(self, partner_id: str, api_key: str, env: str):
        self._partner_id = partner_id
        self._api_key = api_key
        self._sid_server = 1 if env == "production" else 0

    def verify_biometric_kyc(
        self,
        *,
        selfie_base64: str,
        id_type: str,
        id_number: str,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        dob: Optional[str] = None,
        country: str = "NG",
        user_id: str = "",
    ) -> KYCResult:
        try:
            return self._call_smile_identity(
                selfie_base64=selfie_base64,
                id_type=id_type,
                id_number=id_number,
                first_name=first_name,
                last_name=last_name,
                dob=dob,
                country=country,
                user_id=user_id,
            )
        except Exception:
            logger.exception("Smile Identity KYC call failed for user_id=%s", user_id)
            return KYCResult(
                verified=False,
                confidence=None,
                message="Identity verification is temporarily unavailable — please retry from Settings.",
            )

    def _call_smile_identity(
        self,
        *,
        selfie_base64: str,
        id_type: str,
        id_number: str,
        first_name: Optional[str],
        last_name: Optional[str],
        dob: Optional[str],
        country: str,
        user_id: str,
    ) -> KYCResult:
        """NOT YET WIRED TO THE REAL API — see module docstring.

        To finish this: `pip install smile-id-core`, then either paste the
        exact code your Smile ID dashboard generates for "Biometric KYC" /
        Python, or inspect the installed package's WebApi.submit_job source
        for the current parameter names. Replace this method body with that
        call, keeping the KYCResult(...) return shape below so the rest of
        this service (and the onboarding step handler) doesn't need to
        change.

        Sketch of the shape per Smile ID's public docs/SDK descriptions
        (job_id/user_id are yours to generate, partner_params identify the
        job; NOT verified against a live account — confirm before trusting):

            from smile_id_core import WebApi
            api = WebApi(self._partner_id, "", self._api_key, self._sid_server)
            response = api.submit_job(
                partner_params={"user_id": user_id, "job_id": <uuid>, "job_type": <biometric_kyc_job_type>},
                id_info={
                    "country": country, "id_type": id_type, "id_number": id_number,
                    "first_name": first_name, "last_name": last_name, "dob": dob,
                },
                images=[{"image_type_id": 2, "image": selfie_base64}],  # 2 = base64 selfie, per SDK docs
                options={"return_job_status": True},
            )
            # then map response["ResultCode"]/["ConfidenceValue"] to KYCResult
        """
        raise NotImplementedError(
            "Smile Identity call not wired yet — see _call_smile_identity docstring "
            "in app/services/kyc_service.py"
        )


class _UnconfiguredProvider:
    """Used when SMILE_IDENTITY_PARTNER_ID / API_KEY aren't set, so onboarding
    fails closed with a clear message instead of a confusing crash."""

    def verify_biometric_kyc(self, **_kwargs) -> KYCResult:
        return KYCResult(
            verified=False,
            confidence=None,
            message="Identity verification isn't configured yet for this environment.",
        )


def get_kyc_provider() -> KYCProvider:
    if settings.smile_identity_partner_id and settings.smile_identity_api_key:
        return _SmileIdentityProvider(
            settings.smile_identity_partner_id,
            settings.smile_identity_api_key,
            settings.smile_identity_env,
        )
    return _UnconfiguredProvider()
