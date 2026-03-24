from __future__ import annotations

from fastapi import APIRouter, Form

router = APIRouter()


def _resp(text: str, end: bool = False) -> str:
    # Africa's Talking format: "CON ..." continue, "END ..." terminate
    prefix = "END" if end else "CON"
    return f"{prefix} {text}"


@router.post("/ussd")
def ussd(
    sessionId: str = Form(...),
    serviceCode: str = Form(...),
    phoneNumber: str = Form(...),
    text: str = Form(""),
):
    parts = [p for p in text.split("*") if p]

    if not parts:
        return _resp("Welcome to VentureRoot\n1. Check wallet\n2. Record sale\n3. Loan status")

    if parts[0] == "1":
        return _resp("Wallet: (stub)\n0. Back", end=True)
    if parts[0] == "2":
        return _resp("Record sale: (stub)\n0. Back", end=True)
    if parts[0] == "3":
        return _resp("Loan status: (stub)\n0. Back", end=True)

    return _resp("Invalid option", end=True)

