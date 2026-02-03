
import re

path = 'src/components/OrdersManager.jsx'

with open(path, 'r') as f:
    lines = f.readlines()

# Filters section roughly 643 to 786
start = 642
end = 787

balance = 0
for i in range(start, end):
    line = lines[i]
    open_d = len(re.findall(r'<div\b', line))
    close_d = len(re.findall(r'</div>', line))
    balance += open_d
    balance -= close_d
    # print(f"{i+1}: {balance} (+{open_d} -{close_d})")

print(f"Filters Section Balance (643-786): {balance}")
