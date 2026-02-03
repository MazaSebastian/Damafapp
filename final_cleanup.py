
path = 'src/components/OrdersManager.jsx'

with open(path, 'r') as f:
    lines = f.readlines()

new_lines = []
cut_start = -1
cut_end = -1

# Helper code
helper_code = r"""
    const formatScheduledTime = (order) => {
        try {
            const raw = order.scheduled_time
            if (!raw) return ''
            if (typeof raw === 'string' && !raw.includes('{') && raw.includes(':')) return raw.slice(0, 5)
            let parsed = raw
            if (typeof raw === 'string' && raw.includes('{')) {
                parsed = JSON.parse(raw)
            }
            if (parsed && parsed.start_time) return parsed.start_time.slice(0, 5)
            return typeof raw === 'string' ? raw.slice(0, 5) : '??:??'
        } catch (e) {
            return typeof order.scheduled_time === 'string' ? order.scheduled_time.slice(0, 5) : '??:??'
        }
    }
"""

# Scan for FIRST handleWindowPrint
msg_print_idx = -1
for i, line in enumerate(lines):
    if 'handleWindowPrint(order)' in line:
        msg_print_idx = i
        break

if msg_print_idx != -1:
    # Check if lines[msg_print_idx+2] is `    }` (closing braces)
    # We assume valid block ends at msg_print_idx + 2
    # So we want to KEEP msg_print_idx+2.
    # And CUT from msg_print_idx+3 until if(loading).
    
    cut_start = msg_print_idx + 3
    
    # Find if(loading)
    for i in range(cut_start, len(lines)):
        if 'if (loading) return' in lines[i]:
            cut_end = i
            break
            
    if cut_start != -1 and cut_end != -1:
        print(f"Cutting garbage from line {cut_start+1} to {cut_end}")
        new_lines = lines[:cut_start] # Keep up to valid block
        new_lines.append(helper_code) # Insert helper
        new_lines.extend(lines[cut_end:]) # Resume from loading check
        
        with open(path, 'w') as f:
            f.writelines(new_lines)
            
        print("Final cleanup complete.")
    else:
        print("Could not find cut range.")

else:
    print("handleWindowPrint not found.")
