
path = 'src/components/OrdersManager.jsx'

with open(path, 'r') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if 'handleWindowPrint(order)' in line:
        start_idx = i
    if 'if (loading) return' in line:
        end_idx = i
        break # First occurrence

if start_idx != -1 and end_idx != -1:
    print(f"Deleting from {start_idx+1} to {end_idx-1}")
    
    # We keep line `start_idx` (handleWindowPrint)
    # We keep line `end_idx` (if loading)
    
    # We replace lines start_idx+1 ... end_idx-1
    # with closing braces and helper.
    
    helper_code = r"""        }
    }

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
    # Construct new content
    # lines[:start_idx+1] includes handleWindowPrint
    # lines[end_idx:] start from if (loading)
    
    new_lines = lines[:start_idx+1]
    new_lines.append(helper_code)
    new_lines.extend(lines[end_idx:])
    
    with open(path, 'w') as f:
        f.writelines(new_lines)
    print("Line-based cleanup complete.")

else:
    print("Could not find markers.")
