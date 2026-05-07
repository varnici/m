-- Budget_Best Micro-Savings System
-- Tables for savings tracking, reminders, and transactions

-- 1. Users Savings Goals Table
CREATE TABLE IF NOT EXISTS savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    goal_name VARCHAR(255) NOT NULL,
    goal_type VARCHAR(50) NOT NULL, -- 'shop_rent', 'house_rent', 'bills', 'staff_salaries', 'custom'
    target_amount DECIMAL(15, 2) NOT NULL,
    monthly_goal DECIMAL(15, 2) NOT NULL,
    current_savings DECIMAL(15, 2) DEFAULT 0,
    daily_target DECIMAL(15, 2) DEFAULT 0,
    deadline DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Daily Savings Transactions
CREATE TABLE IF NOT EXISTS savings_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL,
    user_id UUID NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'deposit', 'withdrawal', 'interest'
    reference_code VARCHAR(100) UNIQUE,
    status VARCHAR(50) DEFAULT 'completed', -- 'pending', 'completed', 'failed'
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_goal_id FOREIGN KEY (goal_id) REFERENCES savings_goals(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3. Reminder Settings
CREATE TABLE IF NOT EXISTS reminder_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    goal_id UUID NOT NULL,
    reminder_time TIME NOT NULL, -- e.g., '08:00:00'
    reminder_enabled BOOLEAN DEFAULT TRUE,
    reminder_frequency VARCHAR(50) DEFAULT 'daily', -- 'daily', 'weekly', 'custom'
    last_reminded_at TIMESTAMP,
    next_reminder_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_goal_id FOREIGN KEY (goal_id) REFERENCES savings_goals(id) ON DELETE CASCADE
);

-- 4. Consistency Streak (Gamification)
CREATE TABLE IF NOT EXISTS savings_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    current_streak INT DEFAULT 0,
    best_streak INT DEFAULT 0,
    streak_start_date DATE NOT NULL,
    last_saved_date DATE NOT NULL,
    tier_level VARCHAR(50) DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum'
    badges TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    UNIQUE(user_id)
);

-- 5. Auto-Sweep Settings
CREATE TABLE IF NOT EXISTS auto_sweep_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    goal_id UUID NOT NULL,
    auto_save_enabled BOOLEAN DEFAULT FALSE,
    auto_save_amount DECIMAL(15, 2),
    auto_save_time TIME NOT NULL,
    payment_method VARCHAR(100), -- 'card', 'bank_transfer', 'wallet'
    payment_token VARCHAR(255),
    last_auto_save_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_goal_id FOREIGN KEY (goal_id) REFERENCES savings_goals(id) ON DELETE CASCADE
);

-- 6. Budget Allocation Buckets (Visual Breakdown)
CREATE TABLE IF NOT EXISTS budget_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    bucket_name VARCHAR(255) NOT NULL,
    allocation_percentage DECIMAL(5, 2) NOT NULL,
    allocated_amount DECIMAL(15, 2) DEFAULT 0,
    bucket_color VARCHAR(7) DEFAULT '#1F2937',
    icon_name VARCHAR(100),
    priority_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 7. Transaction Logs (Audit Trail)
CREATE TABLE IF NOT EXISTS transaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL, -- 'deposit', 'withdrawal', 'reminder_sent', 'auto_save', etc.
    action_details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 8. Policy Consent Records
CREATE TABLE IF NOT EXISTS policy_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    policy_version VARCHAR(20) NOT NULL,
    policy_content TEXT NOT NULL,
    accepted BOOLEAN DEFAULT FALSE,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create Indexes for Performance
CREATE INDEX idx_savings_goals_user_id ON savings_goals(user_id);
CREATE INDEX idx_savings_goals_is_active ON savings_goals(is_active);
CREATE INDEX idx_savings_transactions_goal_id ON savings_transactions(goal_id);
CREATE INDEX idx_savings_transactions_user_id ON savings_transactions(user_id);
CREATE INDEX idx_savings_transactions_created_at ON savings_transactions(created_at);
CREATE INDEX idx_reminder_settings_user_id ON reminder_settings(user_id);
CREATE INDEX idx_reminder_settings_next_reminder ON reminder_settings(next_reminder_at);
CREATE INDEX idx_savings_streaks_user_id ON savings_streaks(user_id);
CREATE INDEX idx_auto_sweep_settings_user_id ON auto_sweep_settings(user_id);
CREATE INDEX idx_budget_buckets_user_id ON budget_buckets(user_id);
CREATE INDEX idx_transaction_logs_user_id ON transaction_logs(user_id);
CREATE INDEX idx_transaction_logs_created_at ON transaction_logs(created_at);
CREATE INDEX idx_policy_consents_user_id ON policy_consents(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_sweep_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_consents ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own data
CREATE POLICY "Users can view own savings_goals" 
ON savings_goals FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own savings_goals" 
ON savings_goals FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own savings_goals" 
ON savings_goals FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions" 
ON savings_transactions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own reminders" 
ON reminder_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own streaks" 
ON savings_streaks FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own auto_sweep" 
ON auto_sweep_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own buckets" 
ON budget_buckets FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transaction_logs" 
ON transaction_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own policy_consents" 
ON policy_consents FOR SELECT 
USING (auth.uid() = user_id);
