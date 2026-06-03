-- VentureRoot Consolidated Analytics & Business Logic Functions
-- Enterprise-Hardened Implementation for Production Deployment

-- 1. CLEANUP: Drop all existing overloads to start fresh
DROP FUNCTION IF EXISTS public.inventory_turnover(text, integer);
DROP FUNCTION IF EXISTS public.inventory_turnover(character varying, integer);
DROP FUNCTION IF EXISTS public.inventory_turnover(uuid, integer);

DROP FUNCTION IF EXISTS public.best_selling_products(character varying, integer);
DROP FUNCTION IF EXISTS public.best_selling_products(text, integer, date, date);
DROP FUNCTION IF EXISTS public.best_selling_products(uuid, integer, date, date);
DROP FUNCTION IF EXISTS public.best_selling_products(character varying, integer, date, date);

DROP FUNCTION IF EXISTS public.total_inventory_value(character varying);
DROP FUNCTION IF EXISTS public.dead_stock_detection(character varying, integer);
DROP FUNCTION IF EXISTS public.margin_percentage(character varying);
DROP FUNCTION IF EXISTS public.profit_per_unit(character varying);
DROP FUNCTION IF EXISTS public.stock_days_remaining(character varying);
DROP FUNCTION IF EXISTS public.restock_quantity_prediction(character varying);

-- 2. INVENTORY TURNOVER
CREATE OR REPLACE FUNCTION public.inventory_turnover(p_owner_id character varying, p_days integer DEFAULT 30)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_cogs BIGINT;
    v_avg_inv DECIMAL;
BEGIN
    -- Calculate COGS (Cost of Goods Sold)
    SELECT COALESCE(SUM(sm.quantity * p.cost_price_kobo), 0) INTO v_cogs
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    WHERE p.owner_id = p_owner_id 
      AND sm.movement_type = 'sale'
      AND sm.created_at >= NOW() - (p_days || ' days')::INTERVAL;

    -- Calculate Average Total Inventory Value from snapshots
    SELECT COALESCE(AVG(daily_total), 0) INTO v_avg_inv
    FROM (
        SELECT SUM(total_inventory_value_kobo) as daily_total
        FROM inventory_snapshots
        WHERE owner_id = p_owner_id
          AND snapshot_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
        GROUP BY snapshot_date
    ) as daily_totals;

    -- Avoid division by zero
    IF v_avg_inv = 0 THEN 
        -- Fallback: use current inventory value if no snapshots exist
        SELECT COALESCE(SUM(sl.quantity_on_hand * p.cost_price_kobo), 0) INTO v_avg_inv
        FROM stock_levels sl
        JOIN products p ON sl.product_id = p.id
        WHERE p.owner_id = p_owner_id;
        
        IF v_avg_inv = 0 THEN RETURN 0; END IF;
    END IF;
    
    RETURN (v_cogs::DECIMAL / v_avg_inv);
END;
$function$;

-- 3. BEST SELLING PRODUCTS
CREATE OR REPLACE FUNCTION public.best_selling_products(
    p_owner_id character varying, 
    p_limit integer DEFAULT 5, 
    p_start_date date DEFAULT NULL, 
    p_end_date date DEFAULT NULL
)
 RETURNS TABLE(product_id character varying, sku character varying, name character varying, total_sold bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, 
        p.sku, 
        p.name, 
        COALESCE(SUM(sm.quantity), 0)::BIGINT as total_sold
    FROM products p
    JOIN stock_movements sm ON p.id = sm.product_id
    WHERE p.owner_id = p_owner_id 
      AND sm.movement_type = 'sale'
      AND (p_start_date IS NULL OR sm.created_at::DATE >= p_start_date)
      AND (p_end_date IS NULL OR sm.created_at::DATE <= p_end_date)
    GROUP BY p.id, p.sku, p.name
    ORDER BY total_sold DESC
    LIMIT p_limit;
END;
$function$;

-- 4. TOTAL INVENTORY VALUE
CREATE OR REPLACE FUNCTION public.total_inventory_value(p_owner_id character varying)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(sl.quantity_on_hand * p.cost_price_kobo), 0)
        FROM stock_levels sl
        JOIN products p ON sl.product_id = p.id
        WHERE p.owner_id = p_owner_id
    );
END;
$function$;

-- 5. DEAD STOCK DETECTION
CREATE OR REPLACE FUNCTION public.dead_stock_detection(p_owner_id character varying, p_days integer DEFAULT 90)
 RETURNS TABLE(product_id character varying, sku character varying, name character varying, value_kobo bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, 
        p.sku, 
        p.name, 
        (SUM(sl.quantity_on_hand) * p.cost_price_kobo)::BIGINT as value_kobo
    FROM products p
    JOIN stock_levels sl ON p.id = sl.product_id
    LEFT JOIN stock_movements sm ON p.id = sm.product_id AND sm.movement_type = 'sale' AND sm.created_at >= NOW() - (p_days || ' days')::INTERVAL
    WHERE p.owner_id = p_owner_id 
      AND p.is_active = TRUE
      AND sm.id IS NULL -- No sales in last X days
    GROUP BY p.id, p.sku, p.name, p.cost_price_kobo
    HAVING SUM(sl.quantity_on_hand) > 0;
END;
$function$;

-- 6. MARGIN PERCENTAGE
CREATE OR REPLACE FUNCTION public.margin_percentage(p_product_id character varying)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

-- 7. PROFIT PER UNIT
CREATE OR REPLACE FUNCTION public.profit_per_unit(p_product_id character varying)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN (
        SELECT (selling_price_kobo - cost_price_kobo)
        FROM products
        WHERE id = p_product_id
    );
END;
$function$;

-- 8. STOCK DAYS REMAINING (Forecasting)
CREATE OR REPLACE FUNCTION public.stock_days_remaining(p_product_id character varying)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_daily_velocity DECIMAL;
    v_current_stock INTEGER;
BEGIN
    -- Calculate average daily sales in last 30 days
    SELECT COALESCE(SUM(quantity)::DECIMAL / 30.0, 0) INTO v_daily_velocity
    FROM stock_movements
    WHERE product_id = p_product_id 
      AND movement_type = 'sale'
      AND created_at >= NOW() - INTERVAL '30 days';

    -- Get current stock
    SELECT COALESCE(SUM(quantity_on_hand), 0) INTO v_current_stock
    FROM stock_levels
    WHERE product_id = p_product_id;

    IF v_daily_velocity <= 0 THEN
        RETURN 999; -- Infinite or unknown
    END IF;

    RETURN FLOOR(v_current_stock / v_daily_velocity);
END;
$function$;

-- 9. RESTOCK QUANTITY PREDICTION
CREATE OR REPLACE FUNCTION public.restock_quantity_prediction(p_product_id character varying)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_daily_velocity DECIMAL;
    v_max_stock INTEGER;
    v_current_stock INTEGER;
BEGIN
    -- Calculate average daily sales in last 30 days
    SELECT COALESCE(SUM(quantity)::DECIMAL / 30.0, 0) INTO v_daily_velocity
    FROM stock_movements
    WHERE product_id = p_product_id 
      AND movement_type = 'sale'
      AND created_at >= NOW() - INTERVAL '30 days';

    -- Get product config
    SELECT maximum_stock_level INTO v_max_stock
    FROM products
    WHERE id = p_product_id;

    -- Get current stock
    SELECT COALESCE(SUM(quantity_on_hand), 0) INTO v_current_stock
    FROM stock_levels
    WHERE product_id = p_product_id;

    -- Simple formula: (Velocity * LeadTime) + SafetyStock - CurrentStock
    -- For now, let's just return what's needed to reach Max Stock
    IF v_current_stock < (v_max_stock * 0.3) THEN
        RETURN v_max_stock - v_current_stock;
    END IF;

    RETURN 0;
END;
$function$;
