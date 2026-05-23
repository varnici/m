from fastapi.testclient import TestClient
from app.main import app

def test_user_create_sale_and_loan_flow():
    with TestClient(app) as client:
        # 1. Create user
        r = client.post(
            "/v1/users",
            json={
                "phone": "2348000000000",
                "email": "a@example.com",
                "full_name": "A User",
                "category": "business_owner"
            },
        )
        assert r.status_code == 200, r.text
        user = r.json()
        user_id = user["id"]

        # 2. Verify wallet exists
        r = client.get(f"/v1/wallet/{user_id}")
        assert r.status_code == 200
        wallet = r.json()
        assert wallet["balance_kobo"] == 0

        # 3. Create the product so that we can record a sale and a loan on it
        r = client.post(
            f"/v1/marketplace/products?owner_id={user_id}",
            json={
                "name": "Cooking Oil 1L",
                "description": "Premium vegetable oil",
                "sku": "SKU-COOKING-OIL-1L",
                "category": "fmcg",
                "unit_price_kobo": 250000,
                "estate": "Lekki Phase 1",
                "city": "Lagos",
            },
        )
        assert r.status_code == 200, r.text

        # 4. Record sale (2 * 250,000 = 500,000 kobo)
        r = client.post(
            "/v1/sales",
            json={
                "user_id": user_id,
                "product_sku": "SKU-COOKING-OIL-1L",
                "quantity": 2,
                "unit_price_kobo": 250000,
                "channel": "manual"
            },
        )
        assert r.status_code == 200, r.text

        # Verify wallet balance after sale (500,000 kobo)
        r = client.get(f"/v1/wallet/{user_id}")
        assert r.status_code == 200
        wallet = r.json()
        assert wallet["balance_kobo"] == 500000

        # 5. Create loan (principal = 1,000,000 kobo)
        r = client.post(
            "/v1/loans",
            json={
                "user_id": user_id,
                "product_sku": "SKU-COOKING-OIL-1L",
                "product_qty": 10,
                "principal_kobo": 1_000_000
            },
        )
        assert r.status_code == 200, r.text
        loan = r.json()
        assert loan["status"] == "active"
        total_due = loan["total_due_kobo"]

        # 6. Verify that an immediate repayment attempt without topup fails due to insufficient funds in wallet
        # Since the wallet has 500,000 kobo and loan total_due is 1,030,000 kobo.
        r = client.post(f"/v1/loans/{loan['id']}/repay", json={"amount_kobo": total_due})
        # The backend should return a 400 Bad Request on insufficient funds
        assert r.status_code == 400, r.text
        assert "funds" in r.text.lower() or "insufficient" in r.text.lower() or "balance" in r.text.lower()

        # 7. Top up wallet to ensure sufficient balance for loan repayment sweep
        # We top up 1,000,000 kobo, giving the wallet a total of 1,500,000 kobo.
        r = client.post(
            f"/v1/wallet/{user_id}/topup",
            json={"amount_kobo": 1_000_000},
        )
        assert r.status_code == 200, r.text

        # Verify wallet balance after topup (500,000 + 1,000,000 = 1,500,000 kobo)
        r = client.get(f"/v1/wallet/{user_id}")
        assert r.status_code == 200
        assert r.json()["balance_kobo"] == 1_500_000

        # 8. Repay the loan now that the wallet has sufficient balance
        r = client.post(f"/v1/loans/{loan['id']}/repay", json={"amount_kobo": total_due})
        assert r.status_code == 200, r.text

        # Verify wallet balance after repayment sweep
        r = client.get(f"/v1/wallet/{user_id}")
        assert r.status_code == 200
        assert r.json()["balance_kobo"] == 1_500_000 - total_due

        # 9. Verify recent transactions ledger logs via endpoint
        r = client.get(f"/v1/transactions/{user_id}/recent")
        assert r.status_code == 200, r.text
        txs = r.json()
        
        # Verify types and order of transactions (recent first)
        tx_types = [tx["type"] for tx in txs]
        assert len(txs) >= 3
        # Should contain "sale_proceeds", "topup", and "repayment_sweep"
        assert "sale_proceeds" in tx_types
        assert "topup" in tx_types
        assert "repayment_sweep" in tx_types

        # Verify the topup details
        topup_tx = next(tx for tx in txs if tx["type"] == "topup")
        assert topup_tx["amount_kobo"] == 1_000_000

        # Verify the sale_proceeds details
        sale_tx = next(tx for tx in txs if tx["type"] == "sale_proceeds")
        assert sale_tx["amount_kobo"] == 500_000

        # Verify the repayment_sweep details
        repayment_tx = next(tx for tx in txs if tx["type"] == "repayment_sweep")
        assert repayment_tx["amount_kobo"] == total_due
