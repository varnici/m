-- Consolidate inventory functions to use character varying and provide robust implementations.

-- 1. Drop all existing overloads to start fresh
DROP FUNCTION IF EXISTS public.inventory_turnover(text, integer);
DROP FUNCTION IF EXISTS public.inventory_turnover(character varying, integer);
DROP FUNCTION IF EXISTS public.inventory_turnover(uuid, integer);

DROP FUNCTION IF EXISTS public.best_selling_products(character varying, integer);
DROP FUNCTION IF EXISTS public.best_selling_products(text, integer, date, date);
DROP FUNCTION IF EXISTS public.best_selling_products(uuid, integer, date, date);

-- 2. Create robust inventory_turnover
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
    -- We use stock_movements joined with products to get cost
    SELECT COALESCE(SUM(sm.quantity * p.cost_price_kobo), 0) INTO v_cogs
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    WHERE p.owner_id = p_owner_id 
      AND sm.movement_type = 'sale'
      AND sm.created_at >= NOW() - (p_days || ' days')::INTERVAL;

    -- Calculate Average Total Inventory Value from snapshots
    -- We aggregate by date first in case there are multiple stores per owner
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
        RETURN 0; 
    END IF;
    
    RETURN (v_cogs::DECIMAL / v_avg_inv);
END;
$function$;

-- 3. Create robust best_selling_products
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

-- 4. Ensure InventorySnapshot total_quantity_on_hand is BIGINT
ALTER TABLE inventory_snapshots ALTER COLUMN total_quantity_on_hand TYPE bigint;
