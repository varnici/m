-- ============================================================================
-- UPDATE INVENTORY FUNCTIONS
-- ============================================================================

-- Update best_selling_products to support date filtering and include SKU
DROP FUNCTION IF EXISTS best_selling_products(TEXT, INTEGER, DATE, DATE);
DROP FUNCTION IF EXISTS best_selling_products(UUID, INTEGER);
CREATE OR REPLACE FUNCTION best_selling_products(
    p_owner_id TEXT, 
    p_limit INTEGER DEFAULT 5,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (product_id UUID, sku VARCHAR, name VARCHAR, total_sold BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id::UUID, p.sku, p.name, COALESCE(SUM(sm.quantity), 0)::BIGINT as total_sold
    FROM products p
    JOIN stock_movements sm ON p.id = sm.product_id
    WHERE p.owner_id::TEXT = p_owner_id 
      AND sm.movement_type = 'sale'
      AND (p_start_date IS NULL OR sm.created_at::DATE >= p_start_date)
      AND (p_end_date IS NULL OR sm.created_at::DATE <= p_end_date)
    GROUP BY p.id, p.sku, p.name
    ORDER BY total_sold DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update inventory_turnover to correctly average totals across stores per day
CREATE OR REPLACE FUNCTION inventory_turnover(p_owner_id TEXT, p_days INTEGER DEFAULT 30)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    v_cogs BIGINT;
    v_avg_inv DECIMAL;
BEGIN
    -- Calculate COGS (Cost of Goods Sold)
    SELECT COALESCE(SUM(sm.quantity * p.cost_price_kobo), 0) INTO v_cogs
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    WHERE p.owner_id::TEXT = p_owner_id 
      AND sm.movement_type = 'sale'
      AND sm.created_at >= NOW() - (p_days || ' days')::INTERVAL;

    -- Calculate Average Total Inventory Value
    -- First get total for each day, then average those totals
    SELECT COALESCE(AVG(daily_total), 0) INTO v_avg_inv
    FROM (
        SELECT SUM(total_inventory_value_kobo) as daily_total
        FROM inventory_snapshots
        WHERE owner_id::TEXT = p_owner_id
          AND snapshot_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
        GROUP BY snapshot_date
    ) as daily_totals;

    IF v_avg_inv = 0 THEN RETURN 0; END IF;
    RETURN (v_cogs::DECIMAL / v_avg_inv);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

