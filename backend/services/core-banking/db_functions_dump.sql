-- Schema: public, Name: inventory_turnover, Args: p_owner_id text, p_days integer DEFAULT 30
CREATE OR REPLACE FUNCTION public.inventory_turnover(p_owner_id text, p_days integer DEFAULT 30)
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
$function$


-- Schema: public, Name: inventory_turnover, Args: p_owner_id character varying, p_days integer DEFAULT 30
CREATE OR REPLACE FUNCTION public.inventory_turnover(p_owner_id character varying, p_days integer DEFAULT 30)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$


-- Schema: public, Name: inventory_turnover, Args: p_owner_id uuid, p_days integer DEFAULT 30
CREATE OR REPLACE FUNCTION public.inventory_turnover(p_owner_id uuid, p_days integer DEFAULT 30)
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

    -- Calculate Average Total Inventory Value
    -- First get total for each day, then average those totals
    SELECT COALESCE(AVG(daily_total), 0) INTO v_avg_inv
    FROM (
        SELECT SUM(total_inventory_value_kobo) as daily_total
        FROM inventory_snapshots
        WHERE owner_id = p_owner_id
          AND snapshot_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
        GROUP BY snapshot_date
    ) as daily_totals;

    IF v_avg_inv = 0 THEN RETURN 0; END IF;
    RETURN (v_cogs::DECIMAL / v_avg_inv);
END;
$function$


-- Schema: public, Name: best_selling_products, Args: p_owner_id character varying, p_limit integer DEFAULT 5
CREATE OR REPLACE FUNCTION public.best_selling_products(p_owner_id character varying, p_limit integer DEFAULT 5)
 RETURNS TABLE(product_id character varying, name character varying, total_sold bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$


-- Schema: public, Name: best_selling_products, Args: p_owner_id text, p_limit integer DEFAULT 5, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date
CREATE OR REPLACE FUNCTION public.best_selling_products(p_owner_id text, p_limit integer DEFAULT 5, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(product_id uuid, sku character varying, name character varying, total_sold bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$


-- Schema: public, Name: best_selling_products, Args: p_owner_id uuid, p_limit integer DEFAULT 5, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date
CREATE OR REPLACE FUNCTION public.best_selling_products(p_owner_id uuid, p_limit integer DEFAULT 5, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(product_id uuid, sku text, name text, total_sold bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT p.id, p.sku, p.name, COALESCE(SUM(sm.quantity), 0)::BIGINT as total_sold
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
$function$


-- Schema: public, Name: total_inventory_value, Args: p_owner_id character varying
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
$function$


-- Schema: public, Name: dead_stock_detection, Args: p_owner_id character varying, p_days integer DEFAULT 90
CREATE OR REPLACE FUNCTION public.dead_stock_detection(p_owner_id character varying, p_days integer DEFAULT 90)
 RETURNS TABLE(product_id character varying, name character varying, last_movement timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$


-- Schema: public, Name: margin_percentage, Args: p_product_id character varying
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
$function$


-- Schema: public, Name: profit_per_unit, Args: p_product_id character varying
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
$function$


