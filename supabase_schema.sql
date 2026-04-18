-- SQL Schema for Supabase - Dashboard Backend Models
-- Run these commands in your Supabase SQL editor

-- First, create the base users table (if it doesn't exist from previous migrations)
-- Note: Your existing schema uses 'profiles', but backend expects 'users'
-- We'll create users table and you can migrate data from profiles if needed

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    full_name TEXT,
    category TEXT NOT NULL DEFAULT 'personal',
    business_name TEXT,
    trading_name TEXT,
    ownership_type TEXT,
    registration_status TEXT,
    location JSONB,
    trust_level TEXT NOT NULL DEFAULT 'bronze',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create wallets table (expanding existing if it exists)
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance_kobo BIGINT NOT NULL DEFAULT 0,
    credit_limit_kobo BIGINT,
    available_credit_kobo BIGINT,
    total_debt_kobo BIGINT DEFAULT 0,
    next_repayment_date TIMESTAMPTZ,
    repayment_amount_kobo BIGINT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create loans table (expanding existing if it exists)
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    principal_kobo BIGINT NOT NULL,
    service_fee_kobo BIGINT NOT NULL DEFAULT 0,
    total_due_kobo BIGINT NOT NULL,
    repaid_kobo BIGINT NOT NULL DEFAULT 0,
    product_sku TEXT NOT NULL,
    product_qty INTEGER NOT NULL,
    disbursed_at TIMESTAMPTZ,
    next_repayment_date DATE,
    outstanding_balance_kobo BIGINT DEFAULT 0,
    days_past_due INTEGER DEFAULT 0,
    last_payment_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create new tables
CREATE TABLE IF NOT EXISTS credit_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 1000),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
    factors JSONB NOT NULL DEFAULT '[]'::jsonb,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS sales_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_sales_kobo BIGINT NOT NULL DEFAULT 0,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    average_transaction_kobo BIGINT NOT NULL DEFAULT 0,
    top_products JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_inventory_value_kobo BIGINT NOT NULL DEFAULT 0,
    low_stock_items INTEGER NOT NULL DEFAULT 0,
    out_of_stock_items INTEGER NOT NULL DEFAULT 0,
    inventory_turnover_ratio REAL NOT NULL DEFAULT 0.0,
    top_selling_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loan_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    active_loans_count INTEGER NOT NULL DEFAULT 0,
    total_loan_amount_kobo BIGINT NOT NULL DEFAULT 0,
    total_outstanding_kobo BIGINT NOT NULL DEFAULT 0,
    repayment_rate REAL NOT NULL DEFAULT 0.0,
    default_rate REAL NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loan_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_kobo BIGINT NOT NULL,
    purpose TEXT NOT NULL,
    term_months INTEGER NOT NULL,
    interest_rate REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disbursed')),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    disbursed_at TIMESTAMPTZ,
    rejection_reason TEXT
);

CREATE TABLE IF NOT EXISTS loan_repayment_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_application_id UUID NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount_kobo BIGINT NOT NULL,
    principal_kobo BIGINT NOT NULL,
    interest_kobo BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    paid_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS loan_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_application_id UUID NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('disbursement', 'repayment', 'fee')),
    amount_kobo BIGINT NOT NULL,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('loan_status', 'payment_due', 'credit_limit', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('system', 'support')),
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_scores_user_id ON credit_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_metrics_user_date ON sales_metrics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_inventory_metrics_user_date ON inventory_metrics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_loan_metrics_user_date ON loan_metrics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_loan_applications_user_status ON loan_applications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_messages_user_read ON messages(user_id, read);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_status ON support_tickets(user_id, status);

-- Optional: Migration script to populate users from existing profiles
-- Uncomment and run this after creating the tables if you have existing profiles data
/*
INSERT INTO users (id, phone, email, full_name, created_at)
SELECT id, phone_number, email, full_name, created_at
FROM profiles
WHERE NOT EXISTS (SELECT 1 FROM users WHERE users.id = profiles.id);
*/