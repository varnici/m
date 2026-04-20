-- ============================================================================
-- INVENTORY MANAGEMENT SYSTEM - BUSINESS LOGIC FUNCTIONS
-- ============================================================================

DO $$
BEGIN
    ALTER TYPE stock_status ADD VALUE IF NOT EXISTS 'overstocked';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 1. Total Inventory Value (Current Asset Value)
CREATE OR REPLACE FUNCTION total_inventory_value(p_owner_id UUID)
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
CREATE OR REPLACE FUNCTION profit_per_unit(p_product_id UUID)
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
CREATE OR REPLACE FUNCTION margin_percentage(p_product_id UUID)
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
-- Formula: COGS / Average Inventory
CREATE OR REPLACE FUNCTION inventory_turnover(p_owner_id UUID, p_days INTEGER DEFAULT 30)
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
    SELECT COALESCE(AVG(total_inventory_value_kobo), 0) INTO v_avg_inv
    FROM inventory_snapshots
    WHERE owner_id = p_owner_id
      AND snapshot_date >= NOW() - (p_days || ' days')::INTERVAL;

    IF v_avg_inv = 0 THEN RETURN 0; END IF;
    RETURN (v_cogs::DECIMAL / v_avg_inv);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Category Health Score (0-100)
CREATE OR REPLACE FUNCTION category_health_score(p_category_id UUID)
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

-- 6. Dead Stock Detection (Items not moved in X days)
CREATE OR REPLACE FUNCTION dead_stock_detection(p_owner_id UUID, p_days INTEGER DEFAULT 90)
RETURNS TABLE (product_id UUID, name TEXT, last_movement TIMESTAMPTZ) AS $$
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

-- 7. Restock Quantity Prediction (EOQ Simplified)
CREATE OR REPLACE FUNCTION restock_quantity_prediction(p_product_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_min_stock INTEGER;
    v_max_stock INTEGER;
    v_current_stock INTEGER;
BEGIN
    SELECT minimum_stock_level, maximum_stock_level INTO v_min_stock, v_max_stock 
    FROM products WHERE id = p_product_id;
    
    SELECT COALESCE(SUM(quantity_on_hand), 0) INTO v_current_stock 
    FROM stock_levels WHERE product_id = p_product_id;

    IF v_current_stock > v_min_stock THEN RETURN 0; END IF;
    RETURN (v_max_stock - v_current_stock);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Stock Days Remaining (Burn rate based)
CREATE OR REPLACE FUNCTION stock_days_remaining(p_product_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_current_stock INTEGER;
    v_daily_burn_rate DECIMAL;
BEGIN
    SELECT COALESCE(SUM(quantity_on_hand), 0) INTO v_current_stock 
    FROM stock_levels WHERE product_id = p_product_id;

    -- Calculate avg daily sales over last 30 days
    SELECT COALESCE(SUM(quantity)::DECIMAL / 30, 0) INTO v_daily_burn_rate
    FROM stock_movements
    WHERE product_id = p_product_id 
      AND movement_type = 'sale'
      AND created_at >= NOW() - INTERVAL '30 days';

    IF v_daily_burn_rate = 0 THEN RETURN 999; END IF;
    RETURN (v_current_stock / v_daily_burn_rate)::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Best Selling Products
CREATE OR REPLACE FUNCTION best_selling_products(p_owner_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE (product_id UUID, name TEXT, total_sold BIGINT) AS $$
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

-- 10. Supplier Performance Score (0-100)
-- Based on delivery lead time adherence and order fulfillment
CREATE OR REPLACE FUNCTION supplier_performance_score(p_supplier_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_total_orders INTEGER;
    v_late_orders INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_orders FROM purchase_orders WHERE supplier_id = p_supplier_id AND status = 'received';
    IF v_total_orders = 0 THEN RETURN 100; END IF;

    SELECT COUNT(*) INTO v_late_orders 
    FROM purchase_orders 
    WHERE supplier_id = p_supplier_id 
      AND status = 'received' 
      AND actual_delivery_date > expected_delivery_date;

    RETURN ((v_total_orders - v_late_orders)::DECIMAL / v_total_orders * 100)::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
