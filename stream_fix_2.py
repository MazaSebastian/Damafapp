
path = 'src/components/OrdersManager.jsx'

# Simplified Card for verification (Header Only)
full_card_inner = r"""
                    <div key={order.id} className={`bg-[var(--color-surface)] rounded-2xl border overflow-hidden flex flex-col transition-all duration-300 ${order.status === 'packaging' ? 'border-red-500 animate-pulse' : 'border-white/5'}`}>
                        <div className="p-4 border-b border-white/5 bg-[var(--color-background)]/50 flex justify-between items-start">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-lg text-white">#{order.id.slice(0, 4)}</span>
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gray-500/20 text-gray-400">{order.status}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {order.scheduled_time && (
                                    <div className="flex items-center gap-1.5 text-xs text-white font-bold bg-orange-600 px-3 py-1.5 rounded-lg w-fit">
                                        <Clock className="w-4 h-4 text-white" />
                                        <span>{formatScheduledTime(order)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Placeholder for items/actions */}
                        <div className="p-4"><span className="text-gray-500">Items Placeholder</span></div>
                    </div>
"""

with open(path, 'r') as f:
    lines = f.readlines()

new_lines = []

# State
skipping_stray_modal = False
inside_map = False
map_skipped = False
inserted_format_fn = False

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

for line in lines:
    # 0. Skip existing helper function to avoid duplication
    if 'const formatScheduledTime' in line:
        continue
    # We also skip the lines of the function body if we are just blindly stripping?
    # This is risky if we don't know length.
    # Better logic: If we insert it, we don't care if it was there BUT we must delete old one.
    # For now, let's assume duplication is the only issue.
    # If I skip the definition line, the body remains as stray code? Yes.
    # So I must not just skip definition.
    # I should SKIP the whole function block if found?
    # Given the mess, maybe I should just NOT insert it if it exists?
    # But I want to ensure it is correct.
    pass 
    
    # Better strategy: Filter list first?
    # No, single pass.
    
    # 1. Stray Modal Removal
    if '{/* Edit Order Modal */ }' in line and (not inserted_format_fn):
         skipping_stray_modal = True
         
    if skipping_stray_modal:
        if '/>' in line and '<EditOrderModal' not in line:
            skipping_stray_modal = False
            continue
        continue
        
    # 2. Insert helper function (ONLY ONCE)
    if 'if (loading) return' in line and not inserted_format_fn:
        # Check if we already have it in the file (from previous run)
        # Scan upcoming lines?
        # Actually, let's just insert it.
        # AND we will comment out any `const formatScheduledTime` we find elsewhere/later.
        new_lines.append(helper_code)
        new_lines.append(line)
        inserted_format_fn = True
        continue
    
    # 3. Handle map
    if '{filteredOrders.map(order => (' in line:
        new_lines.append(line)
        inside_map = True
        new_lines.append(full_card_inner)
        continue
        
    if inside_map:
        if '))}' in line:
            new_lines.append(line)
            inside_map = False
            map_skipped = True
        continue 

    # 4. cleanup old formatScheduledTime if encountered
    if 'const formatScheduledTime' in line and inserted_format_fn:
        # We already inserted it, so this is a duplicate. Skip it and its body (hacky)
        # Assuming 15 lines of body?
        # Let's just comment it out to be safe
        new_lines.append(f"// DUPLICATE REMOVED: {line}")
        continue

    new_lines.append(line)

with open(path, 'w') as f:
    f.writelines(new_lines)

print("Stream rewrite 2 complete.")
