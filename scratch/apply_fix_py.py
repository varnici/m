import psycopg2
import sys

sql = """
-- Update Turnover Function with better fallback and correct logic
CREATE OR REPLACE FUNCTION inventory_turnover(p_owner_id VARCHAR, p_days INTEGER DEFAULT 30)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    v_cogs BIGINT;
    v_avg_inv BIGINT;
BEGIN
    -- 1. Calculate COGS (Cost of Goods Sold)
    SELECT COALESCE(SUM(sm.quantity * p.cost_price_kobo), 0) INTO v_cogs
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    WHERE p.owner_id = p_owner_id 
      AND sm.movement_type = 'sale'
      AND sm.created_at >= NOW() - (p_days || ' days')::INTERVAL;

    -- 2. Calculate Average Inventory Value from Snapshots
    SELECT COALESCE(AVG(total_inventory_value_kobo), 0) INTO v_avg_inv
    FROM inventory_snapshots
    WHERE owner_id = p_owner_id
      AND snapshot_date >= NOW() - (p_days || ' days')::INTERVAL;

    -- 3. Fallback: If no snapshots, use current inventory value
    IF v_avg_inv = 0 THEN
        v_avg_inv := total_inventory_value(p_owner_id);
    END IF;

    -- 4. Final Protection against division by zero
    IF v_avg_inv = 0 THEN 
        RETURN 0.0; 
    END IF;

    RETURN ROUND((v_cogs::DECIMAL / v_avg_inv), 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed a snapshot
INSERT INTO inventory_snapshots (
    id, owner_id, snapshot_date, total_inventory_value_kobo, total_quantity_on_hand, low_stock_items_count, created_at
)
SELECT 
    'seed-' || CURRENT_DATE::text,
    '56dca529-8e72-4ddc-b006-bc8e934bc6b5',
    CURRENT_DATE,
    total_inventory_value('56dca529-8e72-4ddc-b006-bc8e934bc6b5'),
    (SELECT COALESCE(SUM(quantity_on_hand), 0) FROM stock_levels sl JOIN products p ON sl.product_id = p.id WHERE p.owner_id = '56dca529-8e72-4ddc-b006-bc8e934bc6b5'),
    (SELECT COUNT(*) FROM stock_levels sl JOIN products p ON sl.product_id = p.id WHERE p.owner_id = '56dca529-8e72-4ddc-b006-bc8e934bc6b5' AND sl.quantity_on_hand <= p.minimum_stock_level),
    NOW()
ON CONFLICT (id) DO UPDATE SET
    total_inventory_value_kobo = EXCLUDED.total_inventory_value_kobo,
    total_quantity_on_hand = EXCLUDED.total_quantity_on_hand;
"""

try:
    conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot", connect_timeout=5)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(sql)
    print("SQL applied successfully.")
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)
