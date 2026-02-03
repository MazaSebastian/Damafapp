
path = 'src/components/OrdersManager.jsx'

with open(path, 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False

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

inserted = False

for i, line in enumerate(lines):
    # Trigger start of garbage zone
    if 'handleWindowPrint(order)' in line:
        new_lines.append(line)
        # Next lines should be `        }` then `    }`
        # We append them manually to be safe, then SKIP everything until `if (loading)`
        # Wait, indentation is key.
        # Line 590: `            handleWindowPrint(order)`
        # Line 591: `        }`
        # Line 592: `    }`
        
        # We will append the closing braces ourselves to ensure correctness.
        new_lines.append("        }\n")
        new_lines.append("    }\n")
        new_lines.append("\n")
        new_lines.append(helper_code)
        inserted = True
        skip = True
        continue
        
    if skip:
        if 'if (loading) return' in line:
            skip = False
            new_lines.append(line)
        continue
    
    # Also we might have inserted `formatScheduledTime` DUPLICATE if it appears BEFORE handleWindowPrint?
    # Unlikely based on cat output.
    
    # If we see `const formatScheduledTime` and we are NOT skipping (maybe before handlePrint?)
    if 'const formatScheduledTime' in line and not skip:
         # Check if it's the one we just inserted? No, we are appending to new_lines.
         # If it's in the input file, it's a duplicate if we plan to insert it at handlePrint.
         # But cat output showed handlePrint -> garbage -> formatTime.
         # So we are fine.
         pass
         
    new_lines.append(line)

with open(path, 'w') as f:
    f.writelines(new_lines)
    
print("Surgical cleanup complete.")
