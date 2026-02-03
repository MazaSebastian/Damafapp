
path = 'src/components/OrdersManager.jsx'

with open(path, 'r') as f:
    lines = f.readlines()

# We look for EditOrderModal block that is NOT inside return.
# We know it is around line 110-120.
# It is BEFORE `const filteredOrders`.

new_lines = []
skip = False
for line in lines:
    # If we see the stray block start
    if '{/* Edit Order Modal */ }' in line and (len(new_lines) < 200): # Ensure we are targetting the top one
        skip = True
    
    if skip:
        # Check if block ended
        if '/>' in line and '<EditOrderModal' not in line: # End of self closing tag
             # actually end is `        />`
             skip = False
             continue # Skip the closing line too
        if '/>' in line and '/>' == line.strip():
             skip = False
             continue

    if not skip:
        new_lines.append(line)

with open(path, 'w') as f:
    f.writelines(new_lines)

print("Removed stray code.")
