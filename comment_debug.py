
path = 'src/components/OrdersManager.jsx'
with open(path, 'r') as f:
    lines = f.readlines()

# Find the block
start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if '{/* Assign Driver Modal */}' in line or '{/* Assign Driver Modal */ }' in line:
        start_idx = i
    if '<AssignDriverModal' in line and start_idx != -1:
        # confirmed start
        pass
    if '/>' in line and start_idx != -1:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    print(f"Found block from {start_idx+1} to {end_idx+1}")
    # Replace with comment
    # We keep the outer structure valid
    # Just remove the lines content
    lines[start_idx] = "{/* Assign Driver Modal DISABLED */}\n"
    for j in range(start_idx+1, end_idx+1):
        lines[j] = "" # Empty lines
    
    with open(path, 'w') as f:
        f.writelines(lines)
    print("Commented out block.")
else:
    print("Block not found!")
