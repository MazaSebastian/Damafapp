
path = 'src/components/OrdersManager.jsx'
with open(path, 'r') as f:
    lines = f.readlines()

# Truncate after line 1127 (approx)
# Line 1126 is </div> inside logic?
# Step 471:
# 1126: </div> (End of Grid)
# 1127: (Empty)

# We want to keep lines 1 to 1126.
# Then close the Root div (opened at 599).
# Then close return (
# Then close function }
# Then export default

new_lines = lines[:1127]
new_lines.append("        </div>\n") # Close Root
new_lines.append("    )\n") # Close return
new_lines.append("}\n\n") # Close function
new_lines.append("export default OrdersManager\n")

with open(path, 'w') as f:
    f.writelines(new_lines)

print("Truncated file.")
