import { useState, useEffect } from 'react'
import { Bell, ChevronDown, ChevronUp, Check, X, Clock, User, ShoppingBag } from 'lucide-react'

/**
 * PendingOrdersQueue — Floating widget that shows pending orders
 * awaiting admin approval. Quick accept/reject without scrolling.
 */
const PendingOrdersQueue = ({ orders, onAccept, onReject }) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const [prevCount, setPrevCount] = useState(0)
    const [pulse, setPulse] = useState(false)

    const pendingOrders = orders.filter(o =>
        o.status === 'pending_approval' || o.status === 'pending'
    )

    // Pulse animation when new pending orders arrive
    useEffect(() => {
        if (pendingOrders.length > prevCount && pendingOrders.length > 0) {
            setPulse(true)
            setIsExpanded(true) // Auto-expand when new orders arrive
            setTimeout(() => setPulse(false), 2000)
        }
        setPrevCount(pendingOrders.length)
    }, [pendingOrders.length])

    // Don't render if no pending orders
    if (pendingOrders.length === 0) return null

    const displayId = (order) => {
        return order.order_number
            ? `#${String(order.order_number).padStart(4, '0')}`
            : `#${order.id.slice(0, 4)}`
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            {/* Expanded Panel */}
            {isExpanded && (
                <div className="bg-[var(--color-surface)] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 w-[340px] max-h-[60vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                    {/* Panel Header */}
                    <div className="p-4 border-b border-white/10 bg-gradient-to-r from-orange-500/10 to-red-500/10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bell className="w-4 h-4 text-orange-400" />
                                <span className="font-bold text-white text-sm">
                                    Pedidos Pendientes ({pendingOrders.length})
                                </span>
                            </div>
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="text-white/50 hover:text-white p-1 rounded transition-colors"
                            >
                                <ChevronDown className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Orders List */}
                    <div className="overflow-y-auto max-h-[50vh] divide-y divide-white/5">
                        {pendingOrders.map(order => (
                            <div
                                key={order.id}
                                className="p-3 hover:bg-white/5 transition-colors"
                            >
                                {/* Order Info Row */}
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white text-sm">
                                            {displayId(order)}
                                        </span>
                                        <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-bold">
                                            PENDIENTE
                                        </span>
                                    </div>
                                    <span className="font-bold text-[var(--color-secondary)] text-sm">
                                        ${order.total}
                                    </span>
                                </div>

                                {/* Client & Items */}
                                <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] mb-2">
                                    <div className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        <span>{order.profiles?.full_name || order.client_name || 'Cliente'}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <ShoppingBag className="w-3 h-3" />
                                        <span>{order.order_items?.length || 0} items</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>

                                {/* Quick Items Preview */}
                                <div className="text-[11px] text-white/60 mb-3 line-clamp-1">
                                    {order.order_items?.map(item =>
                                        `${item.quantity}x ${item.products?.name || 'Producto'}`
                                    ).join(' · ')}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onAccept(order.id)}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        Aceptar
                                    </button>
                                    <button
                                        onClick={() => onReject(order.id)}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        Rechazar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Floating Badge Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`relative flex items-center gap-2 px-4 py-3 rounded-full font-bold text-sm text-white shadow-2xl shadow-black/40 transition-all active:scale-95 ${pulse
                        ? 'bg-red-500 animate-bounce'
                        : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400'
                    }`}
            >
                <Bell className={`w-5 h-5 ${pulse ? 'animate-pulse' : ''}`} />
                <span>{pendingOrders.length} pendiente{pendingOrders.length > 1 ? 's' : ''}</span>
                {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                ) : (
                    <ChevronUp className="w-4 h-4" />
                )}

                {/* Pulse Ring */}
                {pulse && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full animate-ping" />
                )}
            </button>
        </div>
    )
}

export default PendingOrdersQueue
