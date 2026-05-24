-- =============================================================================
-- MAPVO / VENTUREROOT — ADDITIONAL SCHEMAS FOR BUDGET BEST & MICRO-SAVINGS
-- Migration: 009_missing_budget_best_tables.sql
-- =============================================================================

-- 1. Reminder Settings Table
CREATE TABLE IF NOT EXISTS reminder_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
    reminder_time TIME NOT NULL, -- e.g., '08:00:00'
    reminder_enabled BOOLEAN DEFAULT TRUE,
    reminder_frequency VARCHAR(50) DEFAULT 'daily',
    last_reminded_at TIMESTAMP WITH TIME ZONE,
    next_reminder_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminder_settings_user_id ON reminder_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_settings_next_reminder ON reminder_settings(next_reminder_at);

ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own reminders" ON reminder_settings;
CREATE POLICY "Users can manage own reminders" ON reminder_settings FOR ALL
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);


-- 2. Auto-Sweep Settings Table
CREATE TABLE IF NOT EXISTS auto_sweep_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
    auto_save_enabled BOOLEAN DEFAULT FALSE,
    auto_save_amount DECIMAL(15, 2),
    auto_save_time TIME NOT NULL,
    payment_method VARCHAR(100), -- 'card', 'bank_transfer', 'wallet'
    payment_token VARCHAR(255),
    last_auto_save_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_sweep_settings_user_id ON auto_sweep_settings(user_id);

ALTER TABLE auto_sweep_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own auto_sweep" ON auto_sweep_settings;
CREATE POLICY "Users can manage own auto_sweep" ON auto_sweep_settings FOR ALL
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);


-- 3. Budget Allocation Buckets Table
CREATE TABLE IF NOT EXISTS budget_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bucket_name VARCHAR(255) NOT NULL,
    allocation_percentage DECIMAL(5, 2) NOT NULL,
    allocated_amount DECIMAL(15, 2) DEFAULT 0,
    bucket_color VARCHAR(7) DEFAULT '#1F2937',
    icon_name VARCHAR(100),
    priority_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_buckets_user_id ON budget_buckets(user_id);

ALTER TABLE budget_buckets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own buckets" ON budget_buckets;
CREATE POLICY "Users can manage own buckets" ON budget_buckets FOR ALL
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);


-- 4. Policy Consent Records Table
CREATE TABLE IF NOT EXISTS policy_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    policy_version VARCHAR(20) NOT NULL,
    policy_content TEXT NOT NULL,
    accepted BOOLEAN DEFAULT FALSE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policy_consents_user_id ON policy_consents(user_id);

ALTER TABLE policy_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own policy_consents" ON policy_consents;
CREATE POLICY "Users can manage own policy_consents" ON policy_consents FOR ALL
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);
