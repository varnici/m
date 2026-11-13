"""Server-side calls into Supabase Auth's Admin API — the only client
capable of setting a user's password without them already holding a valid
session (which a locked-out "forgot password" user by definition doesn't
have). Requires SUPABASE_SERVICE_KEY, the service_role key from the
Supabase project's API settings — never the anon key, which this endpoint
would reject.
"""
from __future__ import annotations

import httpx

from app.core.config import settings


class SupabaseAdminError(Exception):
    pass


def set_user_password(user_id: str, new_password: str) -> None:
    """Sets `user_id`'s Supabase Auth password directly, bypassing the normal
    "know your current password" or "click the emailed link" paths — the
    caller (password_reset.py) is responsible for having already verified
    the user's identity (SMS OTP) before calling this.
    """
    if not settings.supabase_url or not settings.supabase_service_key:
        raise SupabaseAdminError(
            "Supabase admin credentials are not configured on this server."
        )

    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/users/{user_id}"
    headers = {
        "apikey": settings.supabase_service_key,
        "Authorization": f"Bearer {settings.supabase_service_key}",
        "Content-Type": "application/json",
    }
    with httpx.Client(timeout=10) as client:
        resp = client.put(url, headers=headers, json={"password": new_password})
        if not resp.is_success:
            raise SupabaseAdminError(
                f"Supabase admin API {resp.status_code}: {resp.text[:200]}"
            )
