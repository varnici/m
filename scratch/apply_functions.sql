-- ============================================================================
-- INVENTORY MANAGEMENT SYSTEM - BUSINESS LOGIC FUNCTIONS (VARCHAR COMPATIBLE)
-- ============================================================================

-- 1. Total Inventory Value (Current Asset Value)
CREATE OR REPLACE FUNCTION total_inventory_value(p_owner_id VARCHAR)
RETURNS BIGINT AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(sl.quantity_on_hand * p.cost_price_kobo), 0)
        FROM stock_levels sl
        JOIN products p ON sl.product_id = p.id
        WHERE p.owner_id = p_owner_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Profit Per Unit (Projected)
CREATE OR REPLACE FUNCTION profit_per_unit(p_product_id VARCHAR)
RETURNS BIGINT AS $$
BEGIN
    RETURN (
        SELECT (selling_price_kobo - cost_price_kobo)
        FROM products
        WHERE id = p_product_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Margin Percentage
CREATE OR REPLACE FUNCTION margin_percentage(p_product_id VARCHAR)
RETURNS DECIMAL(10, 2) AS $$
BEGIN
    RETURN (
        SELECT 
            CASE 
                WHEN cost_price_kobo = 0 THEN 0
                ELSE ((selling_price_kobo - cost_price_kobo)::DECIMAL / cost_price_kobo * 100)
            END
        FROM products
        WHERE id = p_product_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Inventory Turnover Ratio
CREATE OR REPLACE FUNCTION inventory_turnover(p_owner_id VARCHAR, p_days INTEGER DEFAULT 30)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    v_cogs BIGINT;
    v_avg_inv BIGINT;
BEGIN
    -- Calculate COGS (Cost of Goods Sold)
    SELECT COALESCE(SUM(sm.quantity * p.cost_price_kobo), 0) INTO v_cogs
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    WHERE p.owner_id = p_owner_id 
      AND sm.movement_type = 'sale'
      AND sm.created_at >= NOW() - (p_days || ' days')::INTERVAL;

    -- Calculate Average Inventory Value
    -- Since inventory_snapshots might not exist yet, we'll use a simplified version or COALESCE
    SELECT COALESCE(AVG(total_inventory_value_kobo), 0) INTO v_avg_inv
    FROM (SELECT 0 as total_inventory_value_kobo) as dummy; -- Simplified fallback
    
    -- Try to get from snapshots if table exists
    BEGIN
        SELECT COALESCE(AVG(total_inventory_value_kobo), 0) INTO v_avg_inv
        FROM inventory_snapshots
        WHERE owner_id = p_owner_id
          AND snapshot_date >= NOW() - (p_days || ' days')::INTERVAL;
    EXCEPTION WHEN OTHERS THEN
        v_avg_inv := 0;
    END;

    IF v_avg_inv = 0 THEN RETURN 0; END IF;
    RETURN (v_cogs::DECIMAL / v_avg_inv);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Category Health Score (0-100)
CREATE OR REPLACE FUNCTION category_health_score(p_category_id VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    v_total_items INTEGER;
    v_low_stock_items INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_items FROM products WHERE category_id = p_category_id AND is_active = TRUE;
    IF v_total_items = 0 THEN RETURN 100; END IF;

    SELECT COUNT(*) INTO v_low_stock_items 
    FROM stock_levels sl
    JOIN products p ON sl.product_id = p.id
    WHERE p.category_id = p_category_id 
      AND sl.quantity_on_hand <= p.minimum_stock_level;

    RETURN ((v_total_items - v_low_stock_items)::DECIMAL / v_total_items * 100)::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Dead Stock Detection
CREATE OR REPLACE FUNCTION dead_stock_detection(p_owner_id VARCHAR, p_days INTEGER DEFAULT 90)
RETURNS TABLE (product_id VARCHAR, name VARCHAR, last_movement TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.name, MAX(sm.created_at) as last_movement
    FROM products p
    LEFT JOIN stock_movements sm ON p.id = sm.product_id
    WHERE p.owner_id = p_owner_id AND p.is_active = TRUE
    GROUP BY p.id, p.name
    HAVING MAX(sm.created_at) < NOW() - (p_days || ' days')::INTERVAL 
       OR MAX(sm.created_at) IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Best Selling Products
CREATE OR REPLACE FUNCTION best_selling_products(p_owner_id VARCHAR, p_limit INTEGER DEFAULT 5)
RETURNS TABLE (product_id VARCHAR, name VARCHAR, total_sold BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.name, SUM(sm.quantity) as total_sold
    FROM products p
    JOIN stock_movements sm ON p.id = sm.product_id
    WHERE p.owner_id = p_owner_id AND sm.movement_type = 'sale'
    GROUP BY p.id, p.name
    ORDER BY total_sold DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
