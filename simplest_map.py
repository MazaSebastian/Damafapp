
path = 'src/components/OrdersManager.jsx'

with open(path, 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False

for line in lines:
    if '{filteredOrders.map(order => (' in line:
        new_lines.append('{filteredOrders.map(order => <div key={order.id}>TEST</div>)}\n')
        skip = True
        continue
        
    if skip:
        if '))}' in line:
            skip = False
        continue

    new_lines.append(line)

with open(path, 'w') as f:
    f.writelines(new_lines)
    
print("Map simplified.")
