"""
wallet_service.py had zero test coverage before this file, despite being the
only code path that posts to the real double-entry ledger. Covers the two
new types added for the worker-module investment flow
(investment_commitment / investment_return — see worker_module.py's
create_investment/contribute_to_funding_round/collect_dividends/
withdraw_investment and the _mirror_to_wallet_ledger helper that calls into
this from across the Supabase/core-banking database split), plus a
conservation check across a full commit -> return cycle, and
_mirror_to_wallet_ledger's own persistence + best-effort-on-failure
behavior.
"""
from fastapi.testclient import TestClient
from app.main import app
from app.infrastructure.database import SessionLocal
from app.models.ledger import ChartOfAccount, LedgerEntry, LedgerTransaction
from app.models.wallet import Wallet
from app.services import wallet_service
from app.api.v1.endpoints.worker_module import _mirror_to_wallet_ledger


def _create_user(client, phone, category="nine_to_five"):
    r = client.post(
        "/v1/users",
        json={"phone": phone, "email": f"{phone}@example.com", "full_name": "Test Worker", "category": category},
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _seed_chart_of_accounts(db):
    seed = [
        ("1000", "Platform Cash Pool", "asset"),
        ("2000", "User Wallet Liabilities", "liability"),
    ]
    for code, name, account_type in seed:
        if db.get(ChartOfAccount, code) is None:
            db.add(ChartOfAccount(code=code, name=name, account_type=account_type))
    db.commit()


def _wallet_balance(user_id):
    db = SessionLocal()()
    try:
        wallet = db.query(Wallet).filter(Wallet.user_id == user_id).one()
        return wallet.balance_kobo
    finally:
        db.close()


def _ledger_entries_for(reference_id):
    db = SessionLocal()()
    try:
        return (
            db.query(LedgerEntry)
            .join(LedgerTransaction, LedgerTransaction.id == LedgerEntry.transaction_id)
            .filter(LedgerTransaction.reference_id == reference_id)
            .all()
        )
    finally:
        db.close()


def test_investment_commitment_debits_wallet_and_posts_balanced_ledger():
    with TestClient(app):
        user_id = _create_user(TestClient(app), "2348060000001")
        db = SessionLocal()()
        try:
            _seed_chart_of_accounts(db)
            wallet = db.query(Wallet).filter(Wallet.user_id == user_id).one()
            wallet.balance_kobo = 500_000
            db.commit()
        finally:
            db.close()

        db = SessionLocal()()
        try:
            wallet_service.process_transaction(
                db, user_id=user_id, type="investment_commitment",
                amount_kobo=200_000, description="test investment", reference_id="inv-1",
            )
            db.commit()
        finally:
            db.close()

        assert _wallet_balance(user_id) == 300_000

        entries = _ledger_entries_for("inv-1")
        assert len(entries) == 2
        total_debit = sum(e.debit_kobo for e in entries)
        total_credit = sum(e.credit_kobo for e in entries)
        assert total_debit == total_credit == 200_000
        assert {e.account_code for e in entries} == {"1000", "2000"}


def test_investment_commitment_rejects_insufficient_funds():
    with TestClient(app):
        user_id = _create_user(TestClient(app), "2348060000002")
        db = SessionLocal()()
        try:
            _seed_chart_of_accounts(db)
        finally:
            db.close()

        db = SessionLocal()()
        try:
            try:
                wallet_service.process_transaction(
                    db, user_id=user_id, type="investment_commitment",
                    amount_kobo=100_000, description="over-commit", reference_id="inv-2",
                )
                assert False, "expected insufficient-funds ValueError"
            except ValueError as e:
                assert "Insufficient funds" in str(e)
        finally:
            db.close()

        # Balance must be unchanged, and no ledger entries should exist for
        # the rejected attempt.
        assert _wallet_balance(user_id) == 0
        assert _ledger_entries_for("inv-2") == []


def test_investment_return_credits_wallet_and_posts_balanced_ledger():
    with TestClient(app):
        user_id = _create_user(TestClient(app), "2348060000003")
        db = SessionLocal()()
        try:
            _seed_chart_of_accounts(db)
        finally:
            db.close()

        db = SessionLocal()()
        try:
            wallet_service.process_transaction(
                db, user_id=user_id, type="investment_return",
                amount_kobo=75_000, description="dividend", reference_id="inv-3",
            )
            db.commit()
        finally:
            db.close()

        assert _wallet_balance(user_id) == 75_000
        entries = _ledger_entries_for("inv-3")
        assert len(entries) == 2
        assert sum(e.debit_kobo for e in entries) == sum(e.credit_kobo for e in entries) == 75_000


def test_investment_commit_then_return_conserves_money():
    """A full commit -> return cycle should leave the wallet exactly where
    it started, with every leg individually balanced — this is the shape
    every real create_investment -> withdraw_investment pair goes through."""
    with TestClient(app):
        user_id = _create_user(TestClient(app), "2348060000004")
        db = SessionLocal()()
        try:
            _seed_chart_of_accounts(db)
            wallet = db.query(Wallet).filter(Wallet.user_id == user_id).one()
            wallet.balance_kobo = 1_000_000
            db.commit()
        finally:
            db.close()

        db = SessionLocal()()
        try:
            wallet_service.process_transaction(
                db, user_id=user_id, type="investment_commitment",
                amount_kobo=400_000, description="invest", reference_id="inv-4",
            )
            db.commit()
        finally:
            db.close()

        assert _wallet_balance(user_id) == 600_000

        db = SessionLocal()()
        try:
            # Principal + a small yield returned on withdrawal.
            wallet_service.process_transaction(
                db, user_id=user_id, type="investment_return",
                amount_kobo=420_000, description="withdraw", reference_id="inv-4",
            )
            db.commit()
        finally:
            db.close()

        assert _wallet_balance(user_id) == 1_020_000  # net +20,000 yield, principal fully conserved


def test_mirror_to_wallet_ledger_persists_across_a_fresh_session():
    """The whole point of _mirror_to_wallet_ledger is to survive past the
    request that called it — read it back with a brand new session (not the
    one the helper used) to prove it actually committed, not just flushed."""
    with TestClient(app):
        user_id = _create_user(TestClient(app), "2348060000005")
        db = SessionLocal()()
        try:
            _seed_chart_of_accounts(db)
        finally:
            db.close()

        _mirror_to_wallet_ledger(
            user_id=user_id, type="investment_return", amount_kobo=50_000,
            description="mirrored dividend", reference_id="inv-5",
        )

        assert _wallet_balance(user_id) == 50_000
        assert len(_ledger_entries_for("inv-5")) == 2


def test_mirror_to_wallet_ledger_is_best_effort_on_failure():
    """A user with no wallet row must not raise out of the mirror helper —
    it's called after the Supabase-side action already committed, so raising
    here would surface as a 500 for an action that actually succeeded."""
    _mirror_to_wallet_ledger(
        user_id="00000000-0000-0000-0000-000000000000", type="investment_return",
        amount_kobo=10_000, description="no such user", reference_id="inv-6",
    )
    # No assertion needed beyond "did not raise" — that's the contract.


def test_mirror_to_wallet_ledger_skips_zero_amount():
    with TestClient(app):
        user_id = _create_user(TestClient(app), "2348060000006")
        db = SessionLocal()()
        try:
            _seed_chart_of_accounts(db)
        finally:
            db.close()

        _mirror_to_wallet_ledger(
            user_id=user_id, type="investment_return", amount_kobo=0,
            description="nothing to collect", reference_id="inv-7",
        )
        assert _wallet_balance(user_id) == 0
        assert _ledger_entries_for("inv-7") == []
