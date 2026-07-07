"""
Provider-agnostic SMS interface.

Set SMS_PROVIDER in backend/.env to choose delivery method:

  SMS_PROVIDER=mock              → prints code to Docker logs (free, dev only)
  SMS_PROVIDER=africas_talking   → Africa's Talking (free sandbox, ~₦4/SMS production)
  SMS_PROVIDER=termii            → Termii Nigerian provider
"""
from __future__ import annotations

import os
from abc import ABC, abstractmethod

import httpx


class SmsProvider(ABC):
    @abstractmethod
    def send(self, phone: str, message: str) -> None: ...


class MockProvider(SmsProvider):
    """Logs the OTP to Docker stdout. Zero cost. For development only."""
    def send(self, phone: str, message: str) -> None:
        print(f"\n{'='*55}")
        print(f"  [MockSMS] To: {phone}")
        print(f"  Message : {message}")
        print(f"{'='*55}\n")


class AfricasTalkingProvider(SmsProvider):
    """
    Africa's Talking — built for African markets.
    Free sandbox at sandbox.africastalking.com, ~₦4/SMS in production.

    Sign up: https://africastalking.com
    Required env vars:
      AT_USERNAME   → your Africa's Talking username (use 'sandbox' for testing)
      AT_API_KEY    → from dashboard → Settings → API Key
      AT_SENDER_ID  → optional shortcode/alphanumeric (leave empty for shared short code)
    """
    def __init__(self) -> None:
        self.username  = os.environ["AT_USERNAME"]
        self.api_key   = os.environ["AT_API_KEY"]
        self.sender_id = os.getenv("AT_SENDER_ID", "")
        # sandbox vs production base URL
        if self.username == "sandbox":
            self.base_url = "https://api.sandbox.africastalking.com/version1"
        else:
            self.base_url = "https://api.africastalking.com/version1"

    def send(self, phone: str, message: str) -> None:
        payload: dict = {
            "username": self.username,
            "to":       phone,
            "message":  message,
        }
        if self.sender_id:
            payload["from"] = self.sender_id

        headers = {
            "apiKey":       self.api_key,
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept":       "application/json",
        }
        with httpx.Client(timeout=10) as client:
            resp = client.post(
                f"{self.base_url}/messaging",
                data=payload,
                headers=headers,
            )
        if not resp.is_success:
            raise RuntimeError(f"Africa's Talking {resp.status_code}: {resp.text[:300]}")

        result = resp.json()
        recipients = result.get("SMSMessageData", {}).get("Recipients", [])
        if recipients:
            status = recipients[0].get("status", "")
            if status not in ("Success", "sent"):
                raise RuntimeError(f"Africa's Talking delivery failed: {status}")


class TermiiProvider(SmsProvider):
    """
    Termii — Nigerian SMS provider.
    Get your key at: https://termii.com → Settings → API Key & Webhooks
    """
    def __init__(self) -> None:
        self.api_key   = os.environ["TERMII_API_KEY"]
        self.sender_id = os.getenv("TERMII_SENDER_ID", "N-Alert")
        self.channel   = os.getenv("TERMII_CHANNEL", "generic")
        self.base_url  = os.getenv("TERMII_BASE_URL", "https://api.ng.termii.com/api")

    def send(self, phone: str, message: str) -> None:
        payload = {
            "to":      phone,
            "from":    self.sender_id,
            "sms":     message,
            "type":    "plain",
            "channel": self.channel,
            "api_key": self.api_key,
        }
        with httpx.Client(timeout=10) as client:
            resp = client.post(f"{self.base_url}/sms/send", json=payload)
        if not resp.is_success:
            raise RuntimeError(f"Termii {resp.status_code}: {resp.text[:300]}")


def get_sms_provider() -> SmsProvider:
    provider = os.getenv("SMS_PROVIDER", "mock")

    if provider == "africas_talking":
        return AfricasTalkingProvider()
    if provider == "termii":
        return TermiiProvider()
    return MockProvider()
