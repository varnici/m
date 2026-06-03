-- Savings Module (002): goals, transactions, autosweep, streaks and RLS.

CREATE TABLE IF NOT EXISTS savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_name VARCHAR(255) NOT NULL,
    goal_type VARCHAR(64) NOT NULL,
    target_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    monthly_goal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    current_savings NUMERIC(15, 2) NOT NULL DEFAULT 0,
    daily_target NUMERIC(15, 2) NOT NULL DEFAULT 0,
    deadline DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS savings_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    transaction_type VARCHAR(32) NOT NULL,
    reference_code VARCHAR(128) UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    notes TEXT,
    management_fee NUMERIC(15, 2) NOT NULL DEFAULT 0,
    partner_commission NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auto_sweep_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
    auto_save_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    auto_save_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    auto_save_time TIME NOT NULL DEFAULT '08:00:00',
    payment_method VARCHAR(64) NOT NULL DEFAULT 'card',
    payment_token VARCHAR(255),
    last_auto_save_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS savings_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    streak_count INTEGER NOT NULL DEFAULT 0,
    last_deposit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    tier_state VARCHAR(32) NOT NULL DEFAULT 'starter',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user_active ON savings_goals(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_savings_transactions_user_date ON savings_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_sweep_enabled_time ON auto_sweep_settings(auto_save_enabled, auto_save_time);

ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_sweep_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_streaks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'savings_goals_owner_all') THEN
        CREATE POLICY savings_goals_owner_all ON savings_goals
            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'savings_transactions_owner_all') THEN
        CREATE POLICY savings_transactions_owner_all ON savings_transactions
            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auto_sweep_settings_owner_all') THEN
        CREATE POLICY auto_sweep_settings_owner_all ON auto_sweep_settings
            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'savings_streaks_owner_all') THEN
        CREATE POLICY savings_streaks_owner_all ON savings_streaks
            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

CREATE OR REPLACE FUNCTION process_savings_deposit(
    p_transaction_id UUID,
    p_goal_id UUID,
    p_user_id UUID,
    p_amount NUMERIC,
    p_partner_commission NUMERIC DEFAULT 0
) RETURNS TABLE (transaction_id UUID, updated_total NUMERIC) AS $$
DECLARE
    current_total NUMERIC;
BEGIN
    SELECT current_savings INTO current_total
    FROM savings_goals
    WHERE id = p_goal_id AND user_id = p_user_id
    FOR UPDATE;

    IF current_total IS NULL THEN
        RAISE EXCEPTION 'Savings goal not found for user';
    END IF;

    UPDATE savings_transactions
    SET status = 'completed',
        management_fee = 0,
        partner_commission = COALESCE(p_partner_commission, 0)
    WHERE id = p_transaction_id
      AND user_id = p_user_id;

    UPDATE savings_goals
    SET current_savings = current_total + p_amount,
        updated_at = NOW()
    WHERE id = p_goal_id
      AND user_id = p_user_id;

    RETURN QUERY
    SELECT p_transaction_id, current_total + p_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
