
path = 'src/components/OrdersManager.jsx'

# The goal:
# 1. Remove stray EditOrderModal lines (approx 110-120)
# 2. Inject helper function formatScheduledTime (before if loading)
# 3. Replace the filteredOrders.map(...) block with the FULL CARD logic.

# We will construct new lines.

# Full Card Logic (Minified/Cleaned for python string)
full_card_inner = r"""
                    <div key={order.id} className={`bg-[var(--color-surface)] rounded-2xl border overflow-hidden flex flex-col transition-all duration-300 ${order.status === 'packaging'
                        ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse'
                        : 'border-white/5'
                        }`}>
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 bg-[var(--color-background)]/50 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-lg text-white">
                                        #{order.order_number ? order.order_number.toString().padStart(4, '0') : order.id.slice(0, 4)}
                                    </span>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${getStatusColor(order.status)}`}>
                                        {order.status}
                                    </span>
                                </div>
                                <span className="text-xs text-[var(--color-text-muted)]">
                                    {new Date(order.created_at).toLocaleString()}
                                </span>

                                <div className="flex flex-wrap gap-2 mt-2">
                                    {order.scheduled_time && (
                                        <div className="flex items-center gap-1.5 text-xs text-white font-bold bg-gradient-to-r from-orange-600 to-orange-500 px-3 py-1.5 rounded-lg shadow-lg shadow-orange-900/40 border border-white/10 w-fit animate-in fade-in zoom-in duration-300">
                                            <Clock className="w-4 h-4 text-white" />
                                            <span className="text-white text-sm tracking-wide">
                                                {formatScheduledTime(order)}
                                            </span>
                                        </div>
                                    )}
                                    {order.order_type === 'delivery' ? (
                                        <div className="flex items-center gap-1 text-xs text-white font-bold bg-blue-600 px-3 py-1 rounded-lg shadow-sm w-fit">
                                            <Bell className="w-3.5 h-3.5" /> DELIVERY
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-xs text-white font-bold bg-green-600 px-3 py-1 rounded-lg shadow-sm w-fit">
                                            <ChefHat className="w-3.5 h-3.5" /> RETIRO
                                        </div>
                                    )}
                                </div>

                                {order.notes && (
                                    <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex gap-2">
                                        <div className="mt-0.5"><StickyNote className="w-3 h-3 text-yellow-500" /></div>
                                        <p className="text-xs text-yellow-200/90 italic leading-snug">"{order.notes}"</p>
                                    </div>
                                )}

                                <div className="mt-2 text-xs">
                                    <div className="font-bold text-white text-sm">
                                        {order.profiles?.full_name || order.client_name || 'Invitado'}
                                    </div>
                                    {order.profiles?.customer_id && (
                                        <div className="mt-1">
                                            <span className="bg-[var(--color-primary)] text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                #{order.profiles.customer_id}
                                            </span>
                                        </div>
                                    )}
                                    {(order.profiles?.address || order.delivery_address) && (
                                        <div className="flex items-start gap-1 mt-1 text-[var(--color-text-muted)]">
                                            <span>📍</span>
                                            <span className="italic">{order.profiles?.address || order.delivery_address}</span>
                                        </div>
                                    )}
                                    {(order.profiles?.phone || order.client_phone) && (
                                        <div className="flex items-center gap-1 mt-1 text-[var(--color-text-muted)]">
                                            <span>📞</span> {order.profiles?.phone || order.client_phone}
                                        </div>
                                    )}
                                </div>

                                {(order.profiles?.phone || order.client_phone) && (
                                    <a
                                        href={`https://wa.me/${(order.profiles?.phone || order.client_phone).replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-2 flex items-center justify-center gap-1.5 w-full bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg py-1.5 transition-colors text-xs font-bold"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        Contactar
                                    </a>
                                )}

                                {order.drivers?.name ? (
                                    <div className="flex items-center gap-1 mt-2 text-xs text-orange-400 font-bold bg-orange-500/10 px-2 py-1 rounded-lg border border-orange-500/20 w-fit">
                                        <Bike className="w-3 h-3" /> {order.drivers.name}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 mt-2 text-xs text-white/30 font-bold bg-white/5 px-2 py-1 rounded-lg border border-white/5 w-fit">
                                        <Bike className="w-3 h-3" /> (Sin repartidor)
                                    </div>
                                )}
                            </div>

                            <div className="text-right flex flex-col items-end gap-2">
                                <div className="mb-1">
                                    {order.payment_method === 'cash' && (
                                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/20 text-green-300 text-xs font-bold border border-green-500/30 w-fit ml-auto">
                                            <Banknote className="w-3.5 h-3.5" /> Efectivo
                                        </span>
                                    )}
                                    {order.payment_method === 'transfer' && (
                                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30 w-fit ml-auto">
                                            <Banknote className="w-3.5 h-3.5" /> Transferencia
                                        </span>
                                    )}
                                    {order.payment_method === 'mercadopago' && (
                                        <div className="flex flex-col gap-1 items-end">
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30 w-fit">
                                                <CreditCard className="w-3.5 h-3.5" /> Mercado Pago
                                            </span>
                                            {!order.is_paid && (
                                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-black border border-red-500/30 w-fit animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.4)]">
                                                    ⚠️ PAGO PENDIENTE
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <span className="font-bold text-lg block">${order.total}</span>

                                <div className="flex gap-1 items-center">
                                    <button onClick={() => handleBilling(order)} className="mr-2 flex items-center gap-1 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-500 border border-yellow-600/30 px-2 py-1 rounded text-xs font-bold transition-all"><FileText className="w-3 h-3" /> Facturar</button>
                                    <button onClick={() => openAssignModal(order.id)} className="text-orange-400 hover:text-white p-1 rounded hover:bg-orange-500/20 transition-colors"><Bike className="w-4 h-4" /></button>
                                    <button onClick={() => handlePrint(order)} className="text-[var(--color-text-muted)] hover:text-white p-1 rounded hover:bg-white/10"><Printer className="w-4 h-4" /></button>
                                    <button onClick={() => setEditingOrder(order)} className="text-white hover:text-white p-1 rounded hover:bg-[var(--color-primary)]/20 transition-colors"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => deleteOrder(order.id)} className="text-[var(--color-text-muted)] hover:text-red-400 p-1 rounded hover:bg-white/10"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>

                            <div className="p-4 flex-1 space-y-3">
                                {order.order_items?.map(item => (
                                    <div key={item.id} className="text-sm">
                                        <div className="flex justify-between font-medium"><span>1x {item.products?.name}</span><span className="text-[var(--color-text-muted)]">${item.price_at_time}</span></div>
                                        <div className="pl-4 border-l border-white/10 mt-1 text-xs text-[var(--color-text-muted)] space-y-0.5">
                                            {item.modifiers?.map((m, i) => <div key={i}>+ {m.quantity > 1 ? `(x${m.quantity}) ` : ''}{m.name}</div>)}
                                            {item.side_info && <div>+ {item.side_info.name}</div>}
                                            {item.drink_info && <div>+ {item.drink_info.name}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-3 bg-[var(--color-background)]/30 grid grid-cols-3 gap-2">
                                {(order.status === 'pending' || order.status === 'pending_approval' || order.status === 'pending_payment') && (
                                    <div className="col-span-3 space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => updateStatus(order.id, order.payment_method === 'mercadopago' && !order.is_paid ? 'pending_payment' : 'cooking')} className="bg-green-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-green-500 transition-colors flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Aceptar</button>
                                            <button onClick={() => updateStatus(order.id, 'rejected')} className="bg-red-500/10 text-red-500 py-2 rounded-lg font-bold text-sm hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"><X className="w-4 h-4" /> Rechazar</button>
                                        </div>
                                    </div>
                                )}
                                {order.status === 'cooking' && (
                                    <button onClick={() => updateStatus(order.id, 'packaging')} className="col-span-3 w-full bg-blue-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Preparar Envío</button>
                                )}
                                {order.status === 'packaging' && (
                                    <button onClick={() => updateStatus(order.id, 'sent')} className="col-span-3 bg-purple-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-purple-500 transition-colors flex items-center justify-center gap-2"><Bell className="w-4 h-4" /> Enviar Pedido</button>
                                )}
                                {order.status === 'sent' && (
                                    <button onClick={() => updateStatus(order.id, 'completed')} className="col-span-3 bg-gray-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-gray-500 transition-colors flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Finalizar / Entregado</button>
                                )}
                            </div>
                        </div>"""

with open(path, 'r') as f:
    lines = f.readlines()

new_lines = []

# State
skipping_stray_modal = False
inside_map = False
map_skipped = False
inserted_format_fn = False
inserted_assign_modal = False # We need to ensure we insert it if we skipped it in truncation

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
    stripped = line.strip()
    
    # 1. Stray Modal Removal (Lines 110-120 approx)
    # Trigger: content looks like `{/* Edit Order Modal */}` AND we are in top half of file?
    # Or simplified check: around line 110.
    if '{/* Edit Order Modal */ }' in line and (not inserted_format_fn): # It is before the helper insertion point
         skipping_stray_modal = True
         
    if skipping_stray_modal:
        # Detect end of stray modal
        if '/>' in line and '<EditOrderModal' not in line:
            skipping_stray_modal = False
            continue
        continue
        
    # 2. Insert helper function
    if 'if (loading) return' in line and not inserted_format_fn:
        new_lines.append(helper_code)
        new_lines.append(line)
        inserted_format_fn = True
        continue
    
    # 3. Handle map
    if '{filteredOrders.map(order => (' in line:
        new_lines.append(line)
        inside_map = True
        # Insert our new card logic and SKIP until `))}`
        new_lines.append(full_card_inner)
        continue
        
    if inside_map:
        if '))}' in line:
            new_lines.append(line)
            inside_map = False
            map_skipped = True
        continue # Skip everything inside map

    # 4. Handle AssignModal restoration
    # If we encounter the "DISABLED" comment, replace it.
    if '{/* Assign Driver Modal DISABLED */}' in line:
         # Use valid code
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

    new_lines.append(line)

with open(path, 'w') as f:
    f.writelines(new_lines)

print("Stream rewrite complete.")
