from fastapi.testclient import TestClient
from app.main import app

def test_user_create_sale_and_loan_flow():
    with TestClient(app) as client:
        # 0. Seed a zero-sales decoy "retail" user so the primary user has a
        # non-trivial percentile rank to be judged against (loan eligibility
        # is a percentile rank of 30-day sales volume among business owners).
        r = client.post(
            "/v1/users",
            json={
                "phone": "2348000000099",
                "email": "decoy@example.com",
                "full_name": "Decoy Seller",
                "category": "retail",
            },
        )
        assert r.status_code == 200, r.text

        # 1. Create user
        r = client.post(
            "/v1/users",
            json={
                "phone": "2348000000000",
                "email": "a@example.com",
                "full_name": "A User",
                "category": "retail",
            },
        )
        assert r.status_code == 200, r.text
        user = r.json()
        user_id = user["id"]
        auth_headers = {"X-User-Id": user_id}

        # 2. Verify wallet exists
        r = client.get("/v1/wallet", headers=auth_headers)
        assert r.status_code == 200
        wallet = r.json()
        assert wallet["balance_kobo"] == 0

        # 3. Create the product so that we can record a sale on it. Uses the
        # real /v1/inventory/products endpoint (not /v1/marketplace/products,
        # which has no frontend callers and hardcodes cost_price_kobo equal
        # to unit_price_kobo) so a real margin exists — loan eligibility
        # ranks on 30-day gross profit, not gross revenue.
        r = client.post(
            "/v1/inventory/products",
            json={
                "name": "Cooking Oil 1L",
                "sku": "SKU-COOKING-OIL-1L",
                "cost_price_kobo": 150000,
                "selling_price_kobo": 250000,
                "quantity_on_hand": 100,
            },
            headers=auth_headers,
        )
        assert r.status_code == 201, r.text
        product_id = r.json()["id"]

        # 4. Record sale (2 * 250,000 = 500,000 kobo) via the real
        # /v1/inventory/sales endpoint — the one the actual app calls. The
        # legacy /v1/sales endpoint (record_sale/list_sales_legacy) has zero
        # frontend callers and was deleted; it was also the ONLY code path
        # that ever credited the wallet for a sale, which meant real sales
        # through the real endpoint never reached the seller's wallet until
        # that was fixed in SalesService.create_sales_transaction.
        r = client.post(
            "/v1/inventory/sales",
            json={
                "items": [
                    {"product_id": product_id, "quantity_sold": 2, "unit_price_kobo": 250000},
                ],
                "payment_method": "cash",
            },
            headers=auth_headers,
        )
        assert r.status_code == 201, r.text

        # Verify wallet balance after sale (500,000 kobo)
        r = client.get("/v1/wallet", headers=auth_headers)
        assert r.status_code == 200
        wallet = r.json()
        assert wallet["balance_kobo"] == 500000

        # 5. Create loan application (amount = 300,000 kobo, well within the
        # eligible credit limit since this user is the top seller of the two
        # ranked business owners).
        r = client.post(
            "/v1/loans",
            json={
                "amount_kobo": 300_000,
                "purpose": "Inventory Restock",
                "term_months": 1,
            },
            headers=auth_headers,
        )
        assert r.status_code == 200, r.text
        loan = r.json()
        assert loan["status"] == "disbursed", loan
        loan_id = loan["id"]

        # Verify wallet balance after disbursement (500,000 + 300,000 = 800,000 kobo)
        r = client.get("/v1/wallet", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["balance_kobo"] == 800000

        # Fetch total_due from the dashboard's outstanding balance for this loan
        r = client.get("/v1/loans/dashboard", headers=auth_headers)
        assert r.status_code == 200, r.text
        dashboard = r.json()
        active_loan = next(l for l in dashboard["active_loans"] if l["id"] == loan_id)
        total_due = active_loan["outstanding"]
        assert total_due > 300_000  # principal + interest

        # 6. Verify a repayment attempt for far more than the wallet holds fails
        # with insufficient funds (disbursement itself credits the wallet, so
        # the wallet already covers `total_due` at this point — this checks
        # the guard against an unrealistically large repayment instead).
        r = client.post(
            f"/v1/loans/{loan_id}/repay",
            json={"amount_kobo": total_due + 10_000_000},
            headers=auth_headers,
        )
        # The backend should return a 400 Bad Request on insufficient funds
        assert r.status_code == 400, r.text
        assert "funds" in r.text.lower() or "insufficient" in r.text.lower() or "balance" in r.text.lower()

        # 7. Top up wallet to ensure sufficient balance for loan repayment sweep
        r = client.post(
            "/v1/wallet/topup",
            json={"amount_kobo": 1_000_000},
            headers=auth_headers,
        )
        assert r.status_code == 200, r.text

        # Verify wallet balance after topup (800,000 + 1,000,000 = 1,800,000 kobo)
        r = client.get("/v1/wallet", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["balance_kobo"] == 1_800_000

        # 8. Repay the loan now that the wallet has sufficient balance
        r = client.post(f"/v1/loans/{loan_id}/repay", json={"amount_kobo": total_due}, headers=auth_headers)
        assert r.status_code == 200, r.text

        # Verify wallet balance after repayment sweep
        r = client.get("/v1/wallet", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["balance_kobo"] == 1_800_000 - total_due

        # 9. Verify recent transactions ledger logs via endpoint
        r = client.get(f"/v1/transactions/{user_id}/recent")
        assert r.status_code == 200, r.text
        txs = r.json()

        # Verify types and order of transactions (recent first)
        tx_types = [tx["type"] for tx in txs]
        assert len(txs) >= 4
        # Should contain "sale_proceeds", "loan_disbursement", "topup", and "repayment_sweep"
        assert "sale_proceeds" in tx_types
        assert "loan_disbursement" in tx_types
        assert "topup" in tx_types
        assert "repayment_sweep" in tx_types

        # Verify the topup details
        topup_tx = next(tx for tx in txs if tx["type"] == "topup")
        assert topup_tx["amount_kobo"] == 1_000_000

        # Verify the sale_proceeds details
        sale_tx = next(tx for tx in txs if tx["type"] == "sale_proceeds")
        assert sale_tx["amount_kobo"] == 500_000

        # Verify the loan_disbursement details
        disbursement_tx = next(tx for tx in txs if tx["type"] == "loan_disbursement")
        assert disbursement_tx["amount_kobo"] == 300_000

        # Verify the repayment_sweep details
        repayment_tx = next(tx for tx in txs if tx["type"] == "repayment_sweep")
        assert repayment_tx["amount_kobo"] == total_due
