import re

with open('migrations/002_inventory_system.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

# Make Policies idempotent
# Find all CREATE POLICY "name" ON table
def replace_policy(match):
    policy_name = match.group(1)
    table_name = match.group(2)
    return f'DROP POLICY IF EXISTS {policy_name} ON {table_name};\nCREATE POLICY {policy_name} ON {table_name}'

sql = re.sub(r'CREATE POLICY\s+("[^"]+")\s+ON\s+([a-zA-Z0-9_]+)', replace_policy, sql)

# Make Triggers idempotent
def replace_trigger(match):
    full_match = match.group(0)
    trigger_name = match.group(1)
    table_name = match.group(2)
    return f'DROP TRIGGER IF EXISTS {trigger_name} ON {table_name};\n{full_match}'

sql = re.sub(r'CREATE TRIGGER\s+([a-zA-Z0-9_]+)\s+(?:AFTER|BEFORE)\s+(?:INSERT|UPDATE|DELETE).*?ON\s+([a-zA-Z0-9_]+)', replace_trigger, sql, flags=re.DOTALL | re.IGNORECASE)

# Make Functions idempotent
sql = re.sub(r'CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION', sql, flags=re.IGNORECASE)
sql = re.sub(r'CREATE OR REPLACE OR REPLACE FUNCTION', 'CREATE OR REPLACE FUNCTION', sql, flags=re.IGNORECASE)

# Make Materialized Views idempotent
sql = re.sub(r'CREATE MATERIALIZED VIEW\s+([a-zA-Z0-9_]+)', r'CREATE MATERIALIZED VIEW IF NOT EXISTS \1', sql, flags=re.IGNORECASE)
sql = re.sub(r'CREATE MATERIALIZED VIEW IF NOT EXISTS IF NOT EXISTS', 'CREATE MATERIALIZED VIEW IF NOT EXISTS', sql, flags=re.IGNORECASE)

with open('migrations/002_inventory_system.sql', 'w', encoding='utf-8') as f:
    f.write(sql)
