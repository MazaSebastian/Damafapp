
path = 'src/components/OrdersManager.jsx'
with open(path, 'r') as f:
    content = f.read()

# Fix space in tag
new_content = content.replace('< AssignDriverModal', '<AssignDriverModal')
# Fix space in prop (optional but good)
new_content = new_content.replace('isOpen = {', 'isOpen={')

if content == new_content:
    print("No changes made. String not found?")
else:
    with open(path, 'w') as f:
        f.write(new_content)
    print("Fixed syntax error successfully.")
