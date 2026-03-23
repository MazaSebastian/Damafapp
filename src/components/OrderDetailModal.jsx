import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, ChefHat, Check, ShoppingBag, Bell, Truck, MapPin, Receipt } from 'lucide-react'
import LiveTrackingMap from './LiveTrackingMap'
import { useAuth } from '../context/AuthContext'

/**
 * Order Detail Modal — premium centered floating modal with order info,
 * status timeline, items breakdown, and live delivery tracking.
 */
const OrderDetailModal = ({ isOpen, onClose, order }) => {
    const { user } = useAuth()

    if (!order) return null

    const statusSteps = [
        { key: 'pending', label: 'Recibido', icon: Clock, color: 'yellow' },
        { key: 'cooking', label: 'Cocinando', icon: ChefHat, color: 'orange' },
        { key: 'packaging', label: 'Empacando', icon: ShoppingBag, color: 'blue' },
        ...(order.order_type === 'delivery'
            ? [{ key: 'sent', label: 'En camino', icon: Truck, color: 'purple' }]
            : []),
        { key: 'completed', label: 'Entregado', icon: Check, color: 'green' },
    ]

    const currentStepIndex = statusSteps.findIndex(s => s.key === order.status)
    const isCancelled = order.status === 'cancelled'

    const getItemTotal = (item) => {
        let total = parseFloat(item.price || 0) * (item.quantity || 1)
        if (item.modifiers?.length > 0) {
            item.modifiers.forEach(mod => {
                total += parseFloat(mod.price || 0) * (mod.quantity || 1)
            })
        }
        return total
    }

    const colorMap = {
        yellow: 'bg-yellow-500', orange: 'bg-orange-500',
        blue: 'bg-blue-500', purple: 'bg-purple-500', green: 'bg-green-500'
    }
    const textColorMap = {
        yellow: 'text-yellow-500', orange: 'text-orange-500',
        blue: 'text-blue-500', purple: 'text-purple-500', green: 'text-green-500'
    }
    const glowMap = {
        yellow: 'shadow-yellow-500/20', orange: 'shadow-orange-500/20',
        blue: 'shadow-blue-500/20', purple: 'shadow-purple-500/20', green: 'shadow-green-500/20'
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60]"
                    />

                    {/* Centered Floating Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 20 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                        className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="w-full max-w-md max-h-[85vh] bg-[#1a1a2e] rounded-3xl border border-white/10 shadow-2xl shadow-black/50 flex flex-col pointer-events-auto overflow-hidden">

                            {/* ── Header ── */}
                            <div className="p-5 pb-4 flex justify-between items-start relative">
                                {/* Gradient accent line */}
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-secondary)] to-orange-400 rounded-t-3xl" />

                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">Detalle del Pedido</h2>
                                    <p className="text-xs text-white/40 mt-0.5">
                                        {new Date(order.created_at).toLocaleDateString('es-AR', {
                                            weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/5"
                                >
                                    <X className="w-4 h-4 text-white/60" />
                                </button>
                            </div>

                            {/* ── Scrollable Content ── */}
                            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4 scrollbar-thin">

                                {/* Status Timeline */}
                                {!isCancelled ? (
                                    <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5">
                                        <div className="flex items-center justify-between">
                                            {statusSteps.map((step, idx) => {
                                                const StepIcon = step.icon
                                                const isActive = idx <= currentStepIndex
                                                const isCurrent = idx === currentStepIndex

                                                return (
                                                    <div key={step.key} className="flex flex-col items-center relative flex-1">
                                                        {/* Connector */}
                                                        {idx > 0 && (
                                                            <div className={`absolute top-4 right-1/2 w-full h-0.5 -translate-x-0 ${isActive ? colorMap[step.color] : 'bg-white/10'}`}
                                                                style={{ left: '-50%', right: '50%' }}
                                                            />
                                                        )}
                                                        {/* Icon */}
                                                        <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500
                                                            ${isCurrent
                                                                ? `${colorMap[step.color]} shadow-lg ${glowMap[step.color]} ring-4 ring-white/10`
                                                                : isActive
                                                                    ? `${colorMap[step.color]} opacity-80`
                                                                    : 'bg-white/5 border border-white/10'
                                                            }`}
                                                        >
                                                            <StepIcon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white/25'}`} />
                                                        </div>
                                                        <span className={`text-[10px] font-bold mt-1.5 text-center leading-tight max-w-[60px] ${isCurrent ? textColorMap[step.color] : isActive ? 'text-white/60' : 'text-white/20'}`}>
                                                            {step.label}
                                                        </span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
                                        <X className="w-8 h-8 text-red-400 mx-auto mb-2" />
                                        <p className="font-bold text-red-400 text-sm">Pedido Cancelado</p>
                                    </div>
                                )}

                                {/* Live Tracking */}
                                {order.status === 'sent' && order.order_type === 'delivery' && user && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-orange-400">
                                            <span className="relative flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
                                            </span>
                                            Seguimiento en Vivo
                                        </div>
                                        <LiveTrackingMap order={order} />
                                    </div>
                                )}

                                {/* Delivery/Pickup Info */}
                                <div className="bg-white/[0.03] rounded-2xl p-3.5 border border-white/5 flex items-center gap-3">
                                    {order.order_type === 'delivery' ? (
                                        <>
                                            <div className="w-9 h-9 bg-purple-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <Truck className="w-4 h-4 text-purple-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-white text-sm">Delivery</p>
                                                <p className="text-[11px] text-white/40 truncate">{order.delivery_address || 'Sin dirección'}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-9 h-9 bg-orange-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <MapPin className="w-4 h-4 text-orange-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-sm">Retiro en Local</p>
                                                <p className="text-[11px] text-white/40">Retirar cuando esté listo</p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Items */}
                                <div className="bg-white/[0.03] rounded-2xl border border-white/5 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                                        <Receipt className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
                                        <h3 className="font-bold text-white text-sm">
                                            Productos ({order.order_items?.length || 0})
                                        </h3>
                                    </div>

                                    <div className="divide-y divide-white/5">
                                        {order.order_items?.map(item => (
                                            <div key={item.id} className="px-4 py-3 flex gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-black/30 overflow-hidden flex-shrink-0">
                                                    {item.products?.image_url ? (
                                                        <img src={item.products.image_url} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-lg">🍔</div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <p className="font-bold text-white text-sm leading-tight">
                                                            {item.quantity > 1 && <span className="text-[var(--color-secondary)]">{item.quantity}x </span>}
                                                            {item.products?.name || 'Producto'}
                                                        </p>
                                                        <span className="text-sm font-bold text-white/80 whitespace-nowrap">
                                                            ${getItemTotal(item).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    {/* Removed Ingredients */}
                                                    {item.removed_ingredients?.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {item.removed_ingredients.map((ing, i) => (
                                                                <span key={i} className="text-[10px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full font-bold">
                                                                    🚫 Sin {ing}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* Modifiers (extras) */}
                                                    {item.modifiers?.length > 0 && (
                                                        <div className="mt-1 space-y-px">
                                                            {item.modifiers.map((mod, i) => (
                                                                <p key={i} className="text-[11px] text-emerald-400/70 font-medium">
                                                                    + {mod.name} {mod.quantity > 1 ? `(x${mod.quantity})` : ''} {mod.price > 0 ? `· $${mod.price * (mod.quantity || 1)}` : ''}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {item.side_info && (
                                                        <p className="text-[11px] text-white/40 mt-0.5">🍟 {item.side_info.name}</p>
                                                    )}
                                                    {item.drink_info && (
                                                        <p className="text-[11px] text-white/40 mt-0.5">🥤 {item.drink_info.name}</p>
                                                    )}
                                                    {item.notes && (
                                                        <p className="text-[11px] text-yellow-500/70 mt-1 italic">📝 {item.notes}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {(!order.order_items || order.order_items.length === 0) && (
                                            <div className="px-4 py-6 text-center text-white/30 text-sm">
                                                Sin detalle de productos
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Totals */}
                                <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 space-y-2">
                                    {order.subtotal && order.subtotal !== order.total && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-white/40">Subtotal</span>
                                            <span className="text-white/70">${parseFloat(order.subtotal).toLocaleString()}</span>
                                        </div>
                                    )}
                                    {order.delivery_fee > 0 && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-white/40">Envío</span>
                                            <span className="text-white/70">${parseFloat(order.delivery_fee).toLocaleString()}</span>
                                        </div>
                                    )}
                                    {order.discount > 0 && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-green-400">Descuento</span>
                                            <span className="text-green-400">-${parseFloat(order.discount).toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                        <span className="font-bold text-white">Total</span>
                                        <span className="text-xl font-black text-[var(--color-secondary)]">${parseFloat(order.total).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default OrderDetailModal
