-- Migration 015: Activity logs for staff tracking and audit trail
-- Immutable record of all inventory mutations with actor attribution

CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR PRIMARY KEY,
    owner_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR,
    action VARCHAR NOT NULL,
    entity_type VARCHAR NOT NULL,
    entity_id VARCHAR,
    entity_name VARCHAR,
    details TEXT,
    ip_address VARCHAR,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_activity_logs_owner_created ON activity_logs(owner_id, created_at);
CREATE INDEX IF NOT EXISTS ix_activity_logs_actor ON activity_logs(actor_id);

COMMENT ON TABLE activity_logs IS 'Immutable audit trail — WHO did WHAT to WHICH product, WHEN';
COMMENT ON COLUMN activity_logs.actor_id IS 'The real person (staff/owner) who performed the action';
COMMENT ON COLUMN activity_logs.owner_id IS 'The business owner whose data was modified';
COMMENT ON COLUMN activity_logs.action IS 'create, update, delete, stock_adjust, sale, credit_given, credit_paid';
COMMENT ON COLUMN activity_logs.details IS 'JSON with before/after values for audit';
w