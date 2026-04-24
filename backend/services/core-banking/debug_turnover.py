import psycopg2

def check_turnover_components(user_id):
    try:
        conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot")
        cur = conn.cursor()
        
        # Check COGS
        cur.execute("""
            SELECT COALESCE(SUM(sm.quantity * p.cost_price_kobo), 0)
            FROM stock_movements sm
            JOIN products p ON sm.product_id = p.id
            WHERE p.owner_id = %s 
              AND sm.movement_type = 'sale'
              AND sm.created_at >= NOW() - ('30 days')::INTERVAL;
        """, (user_id,))
        cogs = cur.fetchone()[0]
        print(f"COGS (30 days): {cogs}")

        # Check Snapshots
        cur.execute("""
            SELECT snapshot_date, SUM(total_inventory_value_kobo)
            FROM inventory_snapshots
            WHERE owner_id = %s
              AND snapshot_date >= CURRENT_DATE - ('30 days')::INTERVAL
            GROUP BY snapshot_date
            ORDER BY snapshot_date;
        """, (user_id,))
        snapshots = cur.fetchall()
        print(f"Snapshots found: {len(snapshots)}")
        for s in snapshots:
            print(f"  Date: {s[0]}, Value: {s[1]}")

        # Check average inventory
        cur.execute("""
            SELECT COALESCE(AVG(daily_total), 0)
            FROM (
                SELECT SUM(total_inventory_value_kobo) as daily_total
                FROM inventory_snapshots
                WHERE owner_id = %s
                  AND snapshot_date >= CURRENT_DATE - ('30 days')::INTERVAL
                GROUP BY snapshot_date
            ) as daily_totals;
        """, (user_id,))
        avg_inv = cur.fetchone()[0]
        print(f"Avg Inventory: {avg_inv}")

        # Call the function directly
        cur.execute("SELECT inventory_turnover(%s, 30)", (user_id,))
        result = cur.fetchone()[0]
        print(f"Function Result: {result}")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_turnover_components('56dca529-8e72-4ddc-b006-bc8e934bc6b5')
