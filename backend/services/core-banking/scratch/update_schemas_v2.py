
import os

file_path = r'c:\Users\paulji peters\VentureRoot\backend\services\core-banking\app\schemas\inventory_schemas.py'

with open(file_path, 'r') as f:
    lines = f.readlines()

new_lines = []
current_class = None
for line in lines:
    if line.startswith('class '):
        current_class = line.split('(')[0].replace('class ', '').strip()
    
    new_lines.append(line)
    
    if current_class == 'SalesTransactionOut' and 'total_amount_kobo: int' in line:
        if not any('discount_amount_kobo: int' in l for l in lines[lines.index(line):lines.index(line)+5]):
            new_lines.append('    discount_amount_kobo: int\n')

with open(file_path, 'w') as f:
    f.writelines(new_lines)

print("Updated SalesTransactionOut successfully")
