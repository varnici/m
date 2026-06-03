-- ============================================================================
-- SAVINGS MODULE (BUDGET_BEST) - PRODUCTION MIGRATION
-- ============================================================================
-- This migration implements:
-- - Savings Goals (Buckets)
-- - Savings Transactions (Micro-contributions, Fees)
-- - Savings Streaks (Gamification)
-- - RLS policies for multi-tenant security
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENUM TYPES
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE savings_goal_status AS ENUM ('active', 'completed', 'paused', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE savings_transaction_type AS ENUM ('deposit', 'withdrawal', 'interest', 'fee_rebate', 'adjustment');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE savings_transaction_status AS ENUM ('pending', 'completed', 'failed', 'reversed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- SECTION 2: SAVINGS GOALS (BUCKETS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General' CHECK (category IN ('Rent', 'Salary', 'Bills', 'Education', 'Health', 'Business', 'Emergency', 'General')),
  target_amount_kobo BIGINT NOT NULL CHECK (target_amount_kobo > 0),
  current_total_kobo BIGINT NOT NULL DEFAULT 0 CHECK (current_total_kobo >= 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  status savings_goal_status DEFAULT 'active',
  is_auto_save_enabled BOOLEAN DEFAULT FALSE,
  auto_save_amount_kobo BIGINT DEFAULT 0,
  auto_save_frequency TEXT CHECK (auto_save_frequency IN ('daily', 'weekly', 'monthly')),
  target_date DATE,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_status ON savings_goals(user_id, status);

-- ============================================================================
-- SECTION 3: SAVINGS TRANSACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS savings_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES savings_goals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo <> 0),
  transaction_type savings_transaction_type NOT NULL,
  status savings_transaction_status DEFAULT 'pending',
  management_fee_kobo BIGINT DEFAULT 0,
  partner_commission_kobo BIGINT DEFAULT 0,
  reference TEXT UNIQUE, -- Payment gateway reference
  metadata JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_transactions_goal_id ON savings_transactions(goal_id);
CREATE INDEX IF NOT EXISTS idx_savings_transactions_user_id ON savings_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_transactions_created_at ON savings_transactions(user_id, created_at);

-- ============================================================================
-- SECTION 4: SAVINGS STREAKS (GAMIFICATION)
-- ============================================================================

CREATE TABLE IF NOT EXISTS savings_streaks (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_deposit_date DATE,
  streak_count INTEGER DEFAULT 0 CHECK (streak_count >= 0),
  longest_streak INTEGER DEFAULT 0 CHECK (longest_streak >= 0),
  total_savings_count INTEGER DEFAULT 0,
  last_streak_update TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 5: ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_streaks ENABLE ROW LEVEL SECURITY;

-- Savings Goals Policies
DROP POLICY IF EXISTS "Users can view their own savings goals" ON savings_goals;
CREATE POLICY "Users can view their own savings goals" ON savings_goals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own savings goals" ON savings_goals;
CREATE POLICY "Users can insert their own savings goals" ON savings_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own savings goals" ON savings_goals;
CREATE POLICY "Users can update their own savings goals" ON savings_goals FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own savings goals" ON savings_goals;
CREATE POLICY "Users can delete their own savings goals" ON savings_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Savings Transactions Policies
DROP POLICY IF EXISTS "Users can view their own savings transactions" ON savings_transactions;
CREATE POLICY "Users can view their own savings transactions" ON savings_transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own savings transactions" ON savings_transactions;
CREATE POLICY "Users can insert their own savings transactions" ON savings_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Savings Streaks Policies
DROP POLICY IF EXISTS "Users can view their own savings streaks" ON savings_streaks;
CREATE POLICY "Users can view their own savings streaks" ON savings_streaks FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- SECTION 6: TRIGGERS & FUNCTIONS
-- ============================================================================

-- Function to update current_total in savings_goals atomically
CREATE OR REPLACE FUNCTION update_savings_goal_total()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    UPDATE savings_goals
    SET current_total_kobo = current_total_kobo + NEW.amount_kobo,
        updated_at = NOW()
    WHERE id = NEW.goal_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_savings_goal_total ON savings_transactions;
CREATE TRIGGER tr_update_savings_goal_total
AFTER INSERT OR UPDATE ON savings_transactions
FOR EACH ROW
EXECUTE FUNCTION update_savings_goal_total();

-- Function to handle savings streaks
CREATE OR REPLACE FUNCTION update_savings_streak()
RETURNS TRIGGER AS $$
DECLARE
  today DATE := CURRENT_DATE;
  last_dep DATE;
BEGIN
  IF NEW.transaction_type = 'deposit' AND NEW.status = 'completed' THEN
    INSERT INTO savings_streaks (user_id, last_deposit_date, streak_count, longest_streak, total_savings_count)
    VALUES (NEW.user_id, today, 1, 1, 1)
    ON CONFLICT (user_id) DO UPDATE SET
      streak_count = CASE 
        WHEN savings_streaks.last_deposit_date = today THEN savings_streaks.streak_count
        WHEN savings_streaks.last_deposit_date = today - INTERVAL '1 day' THEN savings_streaks.streak_count + 1
        ELSE 1
      END,
      longest_streak = GREATEST(savings_streaks.longest_streak, 
        CASE 
          WHEN savings_streaks.last_deposit_date = today THEN savings_streaks.streak_count
          WHEN savings_streaks.last_deposit_date = today - INTERVAL '1 day' THEN savings_streaks.streak_count + 1
          ELSE 1
        END
      ),
      last_deposit_date = today,
      total_savings_count = savings_streaks.total_savings_count + 1,
      last_streak_update = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_savings_streak ON savings_transactions;
CREATE TRIGGER tr_update_savings_streak
AFTER INSERT OR UPDATE ON savings_transactions
FOR EACH ROW
EXECUTE FUNCTION update_savings_streak();
