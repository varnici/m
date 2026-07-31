"""HTTP-level coverage for /v1/inventory/voice/parse now that it's a real
proxy to ai-ml-service instead of the old fully-fabricated response. Mocks
httpx so no live ai-ml-service/Groq call happens in tests."""

import base64
from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient
from app.main import app


def _create_user(client: TestClient, phone: str) -> dict:
    r = client.post(
        "/v1/users",
        json={"phone": phone, "email": f"{phone}@example.com", "full_name": "Voice Owner", "category": "retail"},
    )
    assert r.status_code == 200, r.text
    return r.json()


def _fake_transcribe_response(**overrides) -> MagicMock:
    payload = {
        "text": "I sold 5 bags of rice",
        "processed_items": [{
            "name": "Rice",
            "quantity": 5,
            "cost_price_kobo": None,
            "selling_price_kobo": None,
            "movement_type": "sale",
        }],
        "confidence": 0.9,
        "language": "en",
        "source": "groq-llama",
    }
    payload.update(overrides)
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    resp.json = MagicMock(return_value=payload)
    return resp


def test_voice_parse_creates_placeholder_product_and_records_sale():
    with TestClient(app) as client:
        user = _create_user(client, "2348011110010")
        headers = {"X-User-Id": user["id"]}

        r = client.post(
            "/v1/inventory/stores",
            json={"name": "Voice Store", "address": "1 Rd", "city": "Lagos", "state": "Lagos"},
            headers=headers,
        )
        store_id = r.json()["id"]

        # Seed a "Rice" product with real stock so the sale can actually deplete it.
        r = client.post(
            "/v1/inventory/products",
            json={
                "name": "Rice",
                "sku": "SKU-VOICE-RICE",
                "cost_price_kobo": 70000,
                "selling_price_kobo": 90000,
                "quantity_on_hand": 20,
                "store_id": store_id,
            },
            headers=headers,
        )
        assert r.status_code == 201, r.text

        audio_b64 = base64.b64encode(b"fake-audio-bytes").decode()
        with patch("app.services.voice_vision_service.httpx.post", return_value=_fake_transcribe_response()) as mock_post:
            r = client.post(
                "/v1/inventory/voice/parse",
                json={"audio_base64": audio_b64, "store_id": store_id, "language": "en"},
                headers=headers,
            )
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["success"] is True
        assert body["source"] == "groq-llama"
        assert body["data"]["product_name"] == "Rice"
        assert body["data"]["quantity"] == 5
        assert body["data"]["sold"] == 5

        # Confirm ai-ml-service was actually called with the decoded audio + language.
        assert mock_post.call_count == 1
        _, kwargs = mock_post.call_args
        assert kwargs["data"] == {"language": "en"}
        assert kwargs["files"]["file"][1] == b"fake-audio-bytes"

        # Confirm the stock actually depleted (20 - 5 = 15), i.e. this wasn't faked.
        r = client.get(f"/v1/inventory/stock?store_id={store_id}", headers=headers)
        levels = r.json()
        rice_level = next(l for l in levels if l["quantity_on_hand"] in (15,))
        assert rice_level["quantity_on_hand"] == 15


def test_voice_parse_returns_503_when_ai_ml_service_unreachable():
    import httpx as httpx_module

    with TestClient(app) as client:
        user = _create_user(client, "2348011110011")
        headers = {"X-User-Id": user["id"]}

        r = client.post(
            "/v1/inventory/stores",
            json={"name": "Voice Store 2", "address": "1 Rd", "city": "Lagos", "state": "Lagos"},
            headers=headers,
        )
        store_id = r.json()["id"]

        audio_b64 = base64.b64encode(b"fake-audio-bytes").decode()
        with patch(
            "app.services.voice_vision_service.httpx.post",
            side_effect=httpx_module.ConnectError("connection refused"),
        ):
            r = client.post(
                "/v1/inventory/voice/parse",
                json={"audio_base64": audio_b64, "store_id": store_id, "language": "en"},
                headers=headers,
            )
        # Must be an honest failure, not a fabricated 201 like the old fake pipeline.
        assert r.status_code == 503, r.text


def test_voice_parse_rejects_invalid_base64():
    with TestClient(app) as client:
        user = _create_user(client, "2348011110012")
        headers = {"X-User-Id": user["id"]}

        r = client.post(
            "/v1/inventory/stores",
            json={"name": "Voice Store 3", "address": "1 Rd", "city": "Lagos", "state": "Lagos"},
            headers=headers,
        )
        store_id = r.json()["id"]

        # A single character is exactly the case base64.b64decode documents as
        # invalid ("number of data characters cannot be 1 more than a
        # multiple of 4") — deterministic regardless of the lenient
        # non-alphabet-character stripping b64decode does by default.
        r = client.post(
            "/v1/inventory/voice/parse",
            json={"audio_base64": "x", "store_id": store_id, "language": "en"},
            headers=headers,
        )
        assert r.status_code == 422, r.text
