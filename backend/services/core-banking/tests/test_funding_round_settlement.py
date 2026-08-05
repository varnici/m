"""
funding_rounds/investments/business_clusters are Supabase-only raw-SQL
tables (see worker_module.py) with no ORM model and no test Supabase
database available in this environment — the funding-round HTTP endpoints
themselves can't be exercised here the way the rest of this suite tests
endpoints. What CAN be verified without Supabase is _settle_funded_round,
the payout leg that runs entirely against core-banking's own Postgres
(FulfillmentLedger + NotificationService) — this is also the
safety-critical part (real ledger entries), so it's the right thing to
cover even though the Supabase-side trigger path is untested here.
"""
from fastapi.testclient import TestClient
from app.main import app
from app.infrastructure.database import SessionLocal
from app.models.ledger import ChartOfAccount, LedgerEntry, LedgerTransaction
from app.api.v1.endpoints.worker_module import _settle_funded_round


def _create_user(client, phone, category="retail"):
    r = client.post(
        "/v1/users",
        json={"phone": phone, "email": f"{phone}@example.com", "full_name": "Test User", "category": category},
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _seed_chart_of_accounts(db):
    seed = [
        ("1000", "Platform Cash Pool", "asset"),
        ("1100", "Escrow Holding", "asset"),
        ("2100", "Distributor Accounts Payable", "liability"),
        ("2200", "Logistics Fees Payable", "liability"),
        ("2300", "Investor Escrow Payable", "liability"),
        ("4000", "Platform Commission Revenue", "revenue"),
    ]
    for code, name, account_type in seed:
        if db.get(ChartOfAccount, code) is None:
            db.add(ChartOfAccount(code=code, name=name, account_type=account_type))
    db.commit()


def _create_distributor_order(client, distributor_id, buyer_id, total_kobo=5_000_000):
    r = client.post(
        "/v1/inventory/stores",
        json={"name": "Warehouse", "type": "warehouse", "address": "1 Rd", "city": "Lagos", "state": "Lagos", "is_primary": True},
        headers={"X-User-Id": distributor_id},
    )
    store_id = r.json()["id"]

    r = client.post(
        "/v1/inventory/products",
        json={
            "name": "Bulk Rice",
            "sku": "SKU-BULK-RICE",
            "cost_price_kobo": total_kobo - 500_000,
            "selling_price_kobo": total_kobo,
            "trade_price_kobo": total_kobo,
            "is_wholesale_listed": True,
            "quantity_on_hand": 50,
            "store_id": store_id,
        },
        headers={"X-User-Id": distributor_id},
    )
    product_id = r.json()["id"]

    r = client.post(
        f"/v1/distributors/{distributor_id}/orders",
        json={"lines": [{"product_id": product_id, "quantity": 1, "unit_price_kobo": total_kobo}]},
        headers={"X-User-Id": buyer_id},
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_settle_funded_round_records_balanced_ledger_and_notifies_distributor():
    with TestClient(app) as client:
        distributor_id = _create_user(client, "2348055550001", category="distributor")
        from app.infrastructure.database import SessionLocal as SL
        from app.models.onboarding import DistributorProfile

        db = SL()()
        try:
            db.add(DistributorProfile(user_id=distributor_id, company_name="Rice Distro", verified=True))
            _seed_chart_of_accounts(db)
            db.commit()
        finally:
            db.close()

        buyer_id = _create_user(client, "2348055550002", category="retail")
        from app.models.savings import SavingsGoal, SavingsStreak

        db = SL()()
        try:
            db.add(SavingsGoal(user_id=buyer_id, target_amount_kobo=100_000_000, current_total_kobo=100_000_000, title="Fund"))
            db.add(SavingsStreak(user_id=buyer_id, streak_count=40))
            db.commit()
        finally:
            db.close()

        order_id = _create_distributor_order(client, distributor_id, buyer_id, total_kobo=5_000_000)

        _settle_funded_round(
            round_id="test-round-1",
            cluster_id="test-cluster-1",
            distributor_order_id=order_id,
            raised_kobo=5_000_000,
        )

        db = SL()()
        try:
            entries = (
                db.query(LedgerEntry)
                .join(LedgerTransaction, LedgerTransaction.id == LedgerEntry.transaction_id)
                .filter(LedgerTransaction.reference_id == order_id)
                .all()
            )
            assert len(entries) > 0, "expected ledger entries for the settled order"
            total_debits = sum(e.debit_kobo for e in entries)
            total_credits = sum(e.credit_kobo for e in entries)
            assert total_debits == total_credits, "ledger must always balance"

            distributor_ap_credits = sum(
                e.credit_kobo for e in entries if e.account_code == "2100"
            )
            distributor_ap_debits = sum(
                e.debit_kobo for e in entries if e.account_code == "2100"
            )
            # Distributor AP should net to zero: allocated in, paid out.
            assert distributor_ap_credits == distributor_ap_debits
            assert distributor_ap_credits > 0
        finally:
            db.close()

        r = client.get("/v1/notifications", headers={"X-User-Id": distributor_id})
        assert r.status_code == 200, r.text
        items = r.json()["items"]
        fund_notifs = [n for n in items if n["type"] == "fund_transfer" and n["related_entity_id"] == order_id]
        assert len(fund_notifs) == 1
        assert fund_notifs[0]["notification_metadata"]["funding_round_id"] == "test-round-1"


def test_settle_funded_round_no_op_when_no_distributor_order():
    # Should not raise, and should not create any notification.
    _settle_funded_round(round_id="r2", cluster_id="c2", distributor_order_id=None, raised_kobo=1_000_000)
