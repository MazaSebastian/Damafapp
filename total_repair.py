
path = 'src/components/OrdersManager.jsx'

with open(path, 'r') as f:
    lines = f.readlines()

new_lines = []
found_map_start = False

for line in lines:
    if '{filteredOrders.map' in line:
        found_map_start = True
        break # We stop reading old file here
    new_lines.append(line)

if found_map_start:
    # Now append clean structure
    
    # 1. Map Block (Using formatScheduledTime helper)
    
    map_block = r"""
                {filteredOrders.map(order => (
                    <div key={order.id} className={`bg-[var(--color-surface)] rounded-2xl border overflow-hidden flex flex-col transition-all duration-300 ${order.status === 'packaging' ? 'border-red-500 animate-pulse' : 'border-white/5'}`}>
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 bg-[var(--color-background)]/50 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-lg text-white">#{order.id.slice(0, 4)}</span>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${getStatusColor(order.status)}`}>{order.status}</span>
                                </div>
                                <span className="text-xs text-[var(--color-text-muted)]">{new Date(order.created_at).toLocaleString()}</span>
                                <div className="flex flex-wrap gap-2 mt-2">
                                     {order.scheduled_time && (
                                        <div className="flex items-center gap-1.5 text-xs text-white font-bold bg-orange-600 px-3 py-1.5 rounded-lg w-fit">
                                            <Clock className="w-4 h-4 text-white" />
                                            <span>{formatScheduledTime(order)}</span>
                                        </div>
                                     )}
                                     {order.order_type === 'delivery' ? (
                                        <div className="flex items-center gap-1 text-xs text-white font-bold bg-blue-600 px-3 py-1 rounded-lg w-fit"><Bell className="w-3.5 h-3.5" /> DELIVERY</div>
                                     ) : (
                                        <div className="flex items-center gap-1 text-xs text-white font-bold bg-green-600 px-3 py-1 rounded-lg w-fit"><ChefHat className="w-3.5 h-3.5" /> RETIRO</div>
                                     )}
                                </div>
                                {/* Address / Customer info placeholder simplified */}
                                <div className="mt-2 text-xs font-bold text-white">{order.client_name || 'Cliente'}</div>
                            </div>
                            <div className="text-right">
                                <span className="font-bold text-lg block">${order.total}</span>
                                <div className="flex gap-1 mt-2">
                                     <button onClick={() => updateStatus(order.id, 'cooking')} className="bg-green-600 text-white px-2 py-1 rounded text-xs">Accept</button>
                                     <button onClick={() => deleteOrder(order.id)} className="text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                        {/* Items */}
                        <div className="p-4 flex-1 space-y-3">
                             {order.order_items?.map(item => (
                                 <div key={item.id} className="text-sm flex justify-between">
                                     <span>1x {item.products?.name}</span>
                                     <span className="text-gray-400">${item.price_at_time}</span>
                                 </div>
                             ))}
                        </div>
                    </div>
                ))}
"""
    new_lines.append(map_block)
    
    # 2. No Orders Check
    new_lines.append(r"""
                {filteredOrders.length === 0 && (
                    <div className="col-span-full py-20 text-center text-[var(--color-text-muted)]">
                        <div className="bg-[var(--color-surface)] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 opacity-50" />
                        </div>
                        <p className="text-lg font-medium">No hay pedidos pendientes</p>
                        <p className="text-sm opacity-60">Los nuevos pedidos aparecerán aquí</p>
                    </div>
                )}
            </div>

            {/* Assign Driver Modal */}
            <AssignDriverModal
                isOpen={!!selectedOrderForDriver}
                onClose={() => setSelectedOrderForDriver(null)}
                orderId={selectedOrderForDriver}
                onAssign={() => {
                    fetchOrders()
                    setSelectedOrderForDriver(null)
                }}
            />

            {/* Edit Order Modal */}
            <EditOrderModal
                isOpen={!!editingOrder}
                onClose={() => setEditingOrder(null)}
                order={editingOrder}
                onOrderUpdated={() => {
                    fetchOrders()
                    setEditingOrder(null)
                }}
            />

        </div>
    )
}

export default OrdersManager
""")

    with open(path, 'w') as f:
        f.writelines(new_lines)
    print("Total repair complete.")
else:
    print("Could not find filteredOrders.map start.")
