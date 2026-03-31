from fastapi.testclient import TestClient

from app.main import app


def _create_user(client: TestClient, phone: str, category: str = "personal") -> dict:
    r = client.post(
        "/v1/users",
        json={
            "phone": phone,
            "email": f"{phone}@example.com",
            "full_name": f"User {phone[-4:]}",
            "category": category,
        },
    )
    assert r.status_code == 200, r.text
    return r.json()


def test_transport_booking_with_selected_vehicle_and_tracking():
    with TestClient(app) as client:
        rider_user = _create_user(client, "2348000000201", category="business_owner")
        customer_user = _create_user(client, "2348000000202", category="personal")

        driver = client.post(
            "/v1/transport/drivers",
            json={
                "user_id": rider_user["id"],
                "full_name": "Driver One",
                "phone": "08000000001",
                "vehicle_type": "car",
                "vehicle_plate": "LND-123AA",
                "certifications": ["NIN_VERIFIED", "ROADWORTHY", "LASDRI"],
            },
        )
        assert driver.status_code == 200, driver.text

        activate = client.post(f"/v1/transport/drivers/{rider_user['id']}/activate")
        assert activate.status_code == 200, activate.text

        bad_booking = client.post(
            "/v1/transport/bookings",
            json={
                "client_user_id": customer_user["id"],
                "vehicle_type": "motorcycle",
                "pickup_address": "VI pickup",
                "pickup_lat": 6.43,
                "pickup_lng": 3.40,
                "delivery_address": "Ikoyi drop",
                "delivery_lat": 6.45,
                "delivery_lng": 3.41,
                "item_description": "Light package",
                "item_weight_kg": 2.0,
                "declared_goods_value_kobo": 100000,
            },
        )
        # bike should be blocked by geofence in these coordinates
        assert bad_booking.status_code == 400

        booking = client.post(
            "/v1/transport/bookings",
            json={
                "client_user_id": customer_user["id"],
                "vehicle_type": "car",
                "pickup_address": "Yaba pickup",
                "pickup_lat": 6.5244,
                "pickup_lng": 3.3792,
                "delivery_address": "Ikeja drop",
                "delivery_lat": 6.6018,
                "delivery_lng": 3.3515,
                "item_description": "Office supplies",
                "item_weight_kg": 10.0,
                "declared_goods_value_kobo": 250000,
            },
        )
        assert booking.status_code == 200, booking.text
        booking_id = booking.json()["id"]

        assign = client.post(
            f"/v1/transport/bookings/{booking_id}/assign",
            json={"driver_user_id": rider_user["id"]},
        )
        assert assign.status_code == 200, assign.text
        assert assign.json()["vehicle_type"] == "car"
        assert assign.json()["driver_user_id"] == rider_user["id"]

        track = client.post(
            f"/v1/transport/bookings/{booking_id}/tracking?driver_user_id={rider_user['id']}",
            json={"lat": 6.55, "lng": 3.36},
        )
        assert track.status_code == 200, track.text

        track_history = client.get(f"/v1/transport/bookings/{booking_id}/tracking")
        assert track_history.status_code == 200, track_history.text
        assert len(track_history.json()) >= 1

