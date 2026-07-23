import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.infrastructure.database import Base
from app.models.user import User
from app.models.wallet import Wallet
from app.models.inventory import SalesTransaction
from app.models.savings import SavingsGoal, SavingsGoalStatus, SavingsTransaction, SavingsTransactionType, SavingsStreak
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

