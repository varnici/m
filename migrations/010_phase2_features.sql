-- Phase 2: Velocity Scores + Product Savings Goals

CREATE TABLE IF NOT EXISTS velocity_scores (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score           REAL NOT NULL,
  units_per_day   REAL NOT NULL,
  restock_consistency REAL NOT NULL,
  repayment_ratio REAL NOT NULL,
  credit_limit_kobo INTEGER NOT NULL DEFAULT 0,
  breakdown       JSONB NOT NULL DEFAULT '{}',
  calculated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_velocity_scores_user    ON velocity_scores (user_id);
CREATE INDEX IF NOT EXISTS idx_velocity_scores_date    ON velocity_scores (user_id, calculated_at DESC);


CREATE TABLE IF NOT EXISTS product_savings_goals (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id      TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  target_quantity INTEGER NOT NULL,
  saved_kobo      BIGINT NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'active',
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_savings_user ON product_savings_goals (user_id);


CREATE TABLE IF NOT EXISTS product_savings_deposits (
  id              TEXT PRIMARY KEY,
  goal_id         TEXT NOT NULL REFERENCES product_savings_goals(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_kobo     BIGINT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_savings_deposits_goal ON product_savings_deposits (goal_id);
