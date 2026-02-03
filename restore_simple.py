
path = 'src/components/OrdersManager.jsx'
with open(path, 'r') as f:
    content = f.read()

# We need to replace the placeholder we added in Step 510
# Placeholder:
# <div key={order.id} className="p-4 bg-gray-800 text-white mb-4 rounded">
#     Pedido #{order.id.slice(0, 4)}
# </div>

placeholder = '<div key={order.id} className="p-4 bg-gray-800 text-white mb-4 rounded">\n                        Pedido #{order.id.slice(0, 4)}\n                    </div>'
# Note: Indentation might vary. I'll use regex or flexible search.

import re

# We will construct a SIMPLIFIED card.
# We will use the original structure but strip the complex IIFE.

simple_card = r"""
<div key={order.id} className={`bg-[var(--color-surface)] rounded-2xl border overflow-hidden flex flex-col transition-all duration-300 ${order.status === 'packaging' ? 'border-red-500 animate-pulse' : 'border-white/5'}`}>
    <div className="p-4 border-b border-white/5 bg-[var(--color-background)]/50 flex justify-between items-start">
        <div>
            <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-lg text-white">#{order.order_number || order.id.slice(0, 4)}</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gray-500/20 text-gray-400">{order.status}</span>
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">{new Date(order.created_at).toLocaleString()}</span>
            
            {/* Simplified Clock Badge */}
            {order.scheduled_time && (
                 <div className="flex items-center gap-1.5 text-xs text-white font-bold bg-orange-600 px-3 py-1.5 rounded-lg border border-white/10 w-fit">
                    <span>{typeof order.scheduled_time === 'string' ? order.scheduled_time.slice(0,5) : '??:??'}</span>
                </div>
            )}
        </div>
        {/* Right side items */}
        <div className="text-right flex flex-col items-end gap-2">
            <span className="font-bold text-lg block">${order.total}</span>
            <div className="flex gap-1 items-center">
                 <button onClick={() => deleteOrder(order.id)} className="text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
            </div>
        </div>
    </div>
    
    {/* Items Placeholder */}
    <div className="p-4 flex-1 space-y-3">
        {order.order_items?.map(item => (
            <div key={item.id} className="text-sm">
                 1x {item.products?.name}
            </div>
        ))}
    </div>

    {/* Actions Placeholder */}
    <div className="p-3 bg-[var(--color-background)]/30">
        <button onClick={() => updateStatus(order.id, 'cooking')} className="w-full bg-green-600 text-white py-2 rounded-lg">Aceptar Rapidamente</button>
    </div>
</div>
"""

# Replace the loop content
# We need to find `filteredOrders.map(order => (`
# and matching `))`
# We essentially replace:
# {filteredOrders.map(order => (
#    ... simplified card ...
# ))}

pattern = re.compile(r'\{filteredOrders\.map\(order => \(\s*<div key=\{order\.id\}.*?</div>\s*\)\)\}', re.DOTALL)

if pattern.search(content):
    print("Found placeholder.")
    # Construct replacement
    replacement = f"{{filteredOrders.map(order => (\n{simple_card}\n))}}"
    new_content = pattern.sub(replacement, content)
    
    with open(path, 'w') as f:
        f.write(new_content)
    print("Restored simplified card.")
else:
    print("Placeholder not found!")
    # Debug print
    # print(content[700:1200])
