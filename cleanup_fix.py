
path = 'src/components/OrdersManager.jsx'

# Simplified Card (Header Only)
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
                        <div className="p-4"><span className="text-gray-500">Items (Restoring...)</span></div>
                    </div>
"""

with open(path, 'r') as f:
    lines = f.readlines()

new_lines = []

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

inserted_format_fn = False
inside_duplicate_fn = False

inside_map = False

skip_stray = False

for line in lines:
    stripped = line.strip()

    # 1. Skip stray modal logic (110-120)
    if '{/* Edit Order Modal */ }' in line:
         skip_stray = True
    if skip_stray:
         if '/>' in line and '<EditOrderModal' not in line:
             skip_stray = False
             continue
         continue

    # 2. Detect existing formatScheduledTime and SKIP IT (and its body)
    if 'const formatScheduledTime' in line:
        inside_duplicate_fn = True
        continue
    
    if inside_duplicate_fn:
        # Heuristic: The function body ends with `}` followed by `if (loading) return`?
        # No, function block structure.
        # But we know I inserted it BEFORE `if (loading) return`.
        # So we skip until `if (loading) return`.
        if 'if (loading) return' in line:
            inside_duplicate_fn = False
            # Now we are at the anchor point.
            # Insert the SINGLE new copy.
            if not inserted_format_fn:
                new_lines.append(helper_code)
                new_lines.append(line) # append the anchor line
                inserted_format_fn = True
            else:
                new_lines.append(line)
        continue

    # 3. If line is `if (loading) return` and we weren't skipping duplicate fn
    if 'if (loading) return' in line and not inside_duplicate_fn:
         if not inserted_format_fn:
             new_lines.append(helper_code)
             new_lines.append(line)
             inserted_format_fn = True
         else:
             new_lines.append(line)
         continue
         
    # 4. Handle Map Content
    if '{filteredOrders.map(order => (' in line:
        new_lines.append(line)
        inside_map = True
        new_lines.append(full_card_inner)
        continue
        
    if inside_map:
        if '))}' in line:
            new_lines.append(line)
            inside_map = False
        continue

    # 5. Handle AssignModal restoration
    if '{/* Assign Driver Modal DISABLED */}' in line:
         new_lines.append("""                {/* Assign Driver Modal */}
                <AssignDriverModal
                    isOpen={!!selectedOrderForDriver}
                    onClose={() => setSelectedOrderForDriver(null)}
                    orderId={selectedOrderForDriver}
                    onAssign={() => {
                        fetchOrders()
                        setSelectedOrderForDriver(null)
                    }}
                />\n""")
         continue

    # remove old comments about duplicate removal
    if 'DUPLICATE REMOVED' in line:
        continue

    new_lines.append(line)

with open(path, 'w') as f:
    f.writelines(new_lines)

print("Cleanup and restore complete.")
