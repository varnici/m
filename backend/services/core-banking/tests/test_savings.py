import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.infrastructure.database import Base
from app.models.user import User
from app.models.wallet import Wallet
from app.models.inventory import SalesTransaction
from app.models.savings import SavingsGoal, SavingsGoalStatus, SavingsTransaction, SavingsTransactionType, SavingsStreak
from app.models.business_starter_kit import BusinessStarterKit
from app.services.savings_service import SavingsService
from app.schemas.savings_schemas import SavingsGoalCreate, SavingsTransactionCreate

@pytest.fixture
def db_session():
    """Create in-memory SQLite test database with necessary tables and seed mock users."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})

    # Recreate tables (importing models ensures SQLAlchemy registers them on Base)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()

    # Seed mock users because of ForeignKey constraints
    user1 = User(id="test-user-123", phone="+2348000000001", full_name="Test User 1")
    user2 = User(id="test-user-streak", phone="+2348000000002", full_name="Streak User")
    session.add_all([user1, user2])
    session.commit()

    # Seed wallets: savings deposits now genuinely debit the real wallet, so
    # each test user needs funds available (matches production, where every
    # user has a wallet created at signup).
    wallet1 = Wallet(user_id=user1.id, balance_kobo=1_000_000)
    wallet2 = Wallet(user_id=user2.id, balance_kobo=1_000_000)
    session.add_all([wallet1, wallet2])
    session.commit()

    yield session
    session.close()

def test_create_savings_goal(db_session: Session):
    user_id = "test-user-123"
    service = SavingsService(db_session, user_id)
    
    payload = SavingsGoalCreate(
        title="Test Goal",
        category="general",
        target_amount_kobo=100000,
        currency="NGN"
    )
    
    goal = service.create_goal(payload)
    assert goal.title == "Test Goal"
    assert goal.target_amount_kobo == 100000
    assert goal.user_id == user_id
    assert goal.status == SavingsGoalStatus.ACTIVE.value

def test_record_deposit(db_session: Session):
    user_id = "test-user-123"
    service = SavingsService(db_session, user_id)
    
    # Create goal first
    goal_payload = SavingsGoalCreate(
        title="Deposit Test",
        category="general",
        target_amount_kobo=100000
    )
    goal = service.create_goal(goal_payload)
    
    # Record deposit
    tx_payload = SavingsTransactionCreate(
        goal_id=goal.id,
        amount_kobo=10000,
        transaction_type=SavingsTransactionType.DEPOSIT.value
    )
    
    transaction = service.record_transaction(tx_payload)
    assert transaction.amount_kobo == 10000
    
    # Refresh goal
    db_session.refresh(goal)
    assert goal.current_total_kobo == 10000

def test_streak_logic(db_session: Session):
    user_id = "test-user-streak"
    service = SavingsService(db_session, user_id)
    
    # Create goal
    goal = service.create_goal(SavingsGoalCreate(title="Streak Test", category="general", target_amount_kobo=100000))
    
    # First deposit
    service.record_transaction(SavingsTransactionCreate(
        goal_id=goal.id, amount_kobo=1000, transaction_type=SavingsTransactionType.DEPOSIT.value
    ))
    
    dashboard = service.get_dashboard()
    assert dashboard["streak"].streak_count == 1


# ── Business Starter Kit plans ───────────────────────────────────────────────
# A "pay for a business idea over time" plan is just a SavingsGoal tagged
# with starter_kit_id — these tests confirm that tagging works, is validated,
# and rides on the same real deposit/ledger/completion machinery above.

def test_create_goal_with_valid_starter_kit(db_session: Session):
    kit = BusinessStarterKit(
        slug="provision-store", name="Provision Store Starter Kit",
        description="Stock and open a provision store.", business_category="retail",
        icon_name="Store", total_cost_kobo=350000, suggested_duration_months=6,
        items=[{"name": "Shelving", "quantity": 1, "estimated_cost_kobo": 350000}],
    )
    db_session.add(kit)
    db_session.commit()

    service = SavingsService(db_session, "test-user-123")
    goal = service.create_goal(SavingsGoalCreate(
        title="My Provision Store", category="business_starter",
        target_amount_kobo=kit.total_cost_kobo, starter_kit_id=kit.id,
    ))

    assert goal.starter_kit_id == kit.id
    assert goal.starter_kit.name == "Provision Store Starter Kit"


def test_create_goal_with_unknown_starter_kit_rejected(db_session: Session):
    service = SavingsService(db_session, "test-user-123")
    with pytest.raises(ValueError):
        service.create_goal(SavingsGoalCreate(
            title="Bad Kit Plan", category="business_starter",
            target_amount_kobo=100000, starter_kit_id="does-not-exist",
        ))


def test_starter_kit_plan_completes_via_real_deposit(db_session: Session):
    kit = BusinessStarterKit(
        slug="phone-repair", name="Phone Repair Starter Kit",
        description="Tools and stock for a repair stand.", business_category="retail",
        icon_name="Smartphone", total_cost_kobo=20000, suggested_duration_months=4,
        items=[{"name": "Toolkit", "quantity": 1, "estimated_cost_kobo": 20000}],
    )
    db_session.add(kit)
    db_session.commit()

    service = SavingsService(db_session, "test-user-123")
    goal = service.create_goal(SavingsGoalCreate(
        title="My Repair Stand", category="business_starter",
        target_amount_kobo=kit.total_cost_kobo, starter_kit_id=kit.id,
    ))

    service.record_transaction(SavingsTransactionCreate(
        goal_id=goal.id, amount_kobo=20000, transaction_type=SavingsTransactionType.DEPOSIT.value,
    ))

    db_session.refresh(goal)
    assert goal.status == SavingsGoalStatus.COMPLETED.value
    assert goal.current_total_kobo == kit.total_cost_kobo

