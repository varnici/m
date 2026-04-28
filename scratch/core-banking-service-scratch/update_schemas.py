
import os

file_path = r'c:\Users\paulji peters\VentureRoot\backend\services\core-banking\app\schemas\inventory_schemas.py'

with open(file_path, 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    new_lines.append(line)
    if 'payment_method: Optional[str] = "cash"' in line and 'class SalesTransactionCreate' in "".join(lines[max(0, lines.index(line)-10):lines.index(line)]):
        new_lines.append('    discount_amount_kobo: Optional[int] = 0\n')
    if 'total_amount_kobo: int' in line and 'class SalesTransactionOut' in "".join(lines[max(0, lines.index(line)-10):lines.index(line)]):
         new_lines.append('    discount_amount_kobo: int\n')

with open(file_path, 'w') as f:
    f.writelines(new_lines)

print("Updated successfully")
