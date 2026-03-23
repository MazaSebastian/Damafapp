import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Loader2, Clock, ChefHat, Check, ShoppingBag, ArrowRight, Bell, X, ChevronRight } from 'lucide-react'
import BottomNav from '../components/BottomNav'
import { Link, useNavigate } from 'react-router-dom'
import { OrderSkeleton } from '../components/skeletons/OrderSkeleton'
import OrderModal from '../components/OrderModal'
import OrderDetailModal from '../components/OrderDetailModal'
import { useTenantNav } from '../hooks/useTenantNav'
import { useTenant } from '../context/TenantContext'

const MyOrdersPage = () => {
    const { user } = useAuth()
    const navigate = useNavigate()
    const tenantNav = useTenantNav()
    const { tenantLogo, tenantName } = useTenant()
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('active') // 'active' or 'history'
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
    const [selectedOrderId, setSelectedOrderId] = useState(null)

    // Derive selectedOrder from live orders array
    const selectedOrder = selectedOrderId ? orders.find(o => o.id === selectedOrderId) || null : null

    useEffect(() => {
        if (user) {
            fetchOrders()

            // Real-time subscription for status updates
            const channel = supabase
                .channel('my_orders')
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `user_id=eq.${user.id}`
                }, (payload) => {
                    // Update local state when an order status changes
                    setOrders(prevOrders => prevOrders.map(o =>
                        o.id === payload.new.id ? { ...o, ...payload.new } : o
                    ))
                })
                .subscribe()

            return () => {
                supabase.removeChannel(channel)
            }
        } else {
            // Guest Logic: Load from localStorage
            fetchGuestOrders()
        }
    }, [user])

    // Lazy-load order_items when an order is selected and its items are empty
    useEffect(() => {
        if (selectedOrderId && selectedOrder && (!selectedOrder.order_items || selectedOrder.order_items.length === 0)) {
            fetchItemsForOrder(selectedOrderId)
        }
    }, [selectedOrderId])

    const fetchItemsForOrder = async (orderId) => {
        const { data: items } = await supabase
            .from('order_items')
            .select('*, products (name, image_url)')
            .eq('order_id', orderId)

        if (items && items.length > 0) {
            setOrders(prev => prev.map(o =>
                o.id === orderId ? { ...o, order_items: items } : o
            ))
        }
    }

    const fetchOrders = async () => {
        setLoading(true)

        // Step 1: Fetch orders
        const { data: ordersData } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (!ordersData || ordersData.length === 0) {
            setOrders(ordersData || [])
            setLoading(false)
            return
        }

        // Step 2: Fetch order_items separately (avoids nested-select RLS issues)
        const orderIds = ordersData.map(o => o.id)
        const { data: itemsData } = await supabase
            .from('order_items')
            .select('*, products (name, image_url)')
            .in('order_id', orderIds)

        // Step 3: Merge items into orders
        const itemsByOrderId = {}
        if (itemsData) {
            itemsData.forEach(item => {
                if (!itemsByOrderId[item.order_id]) itemsByOrderId[item.order_id] = []
                itemsByOrderId[item.order_id].push(item)
            })
        }

        const ordersWithItems = ordersData.map(order => ({
            ...order,
            order_items: itemsByOrderId[order.id] || []
        }))

        setOrders(ordersWithItems)
        setLoading(false)
    }

    const fetchGuestOrders = () => {
        setLoading(true)
        try {
            const guestOrders = JSON.parse(localStorage.getItem('stacked_guest_orders') || '[]')
            setOrders(guestOrders)
        } catch (e) {
            console.error('Error reading guest orders:', e)
            setOrders([])
        }
        setLoading(false)
    }

    const getStatusInfo = (status) => {
        switch (status) {
            case 'pending_approval': return { label: 'Esperando aprobación', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock }
            case 'pending': return { label: 'Pendiente', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Clock }
            case 'paid': return { label: 'Pago confirmado', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: Check }
            case 'cooking': return { label: 'Cocinando', color: 'text-orange-500', bg: 'bg-orange-500/10', icon: ChefHat }
            case 'packaging': return { label: 'Preparando envío', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: ShoppingBag }
            case 'sent': return { label: 'Pedido Enviado', color: 'text-purple-500', bg: 'bg-purple-500/10', icon: Bell }
            case 'completed': return { label: 'Entregado', color: 'text-gray-400', bg: 'bg-white/5', icon: Check }
            case 'cancelled': return { label: 'Cancelado', color: 'text-red-400', bg: 'bg-red-500/10', icon: X }
            case 'rejected': return { label: 'Rechazado', color: 'text-red-400', bg: 'bg-red-500/10', icon: X }
            default: return { label: status, color: 'text-gray-400', bg: 'bg-white/5', icon: Clock }
        }
    }

    // Filter orders
    const activeOrders = orders.filter(o => ['pending_approval', 'paid', 'pending', 'cooking', 'packaging', 'sent'].includes(o.status))
    const historyOrders = orders.filter(o => ['completed', 'cancelled', 'rejected'].includes(o.status))

    const displayOrders = activeTab === 'active' ? activeOrders : historyOrders

    return (
        <div className="min-h-screen bg-[var(--color-background)] pb-24">
            <header className="p-4 pt-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Mis Pedidos</h1>
                    {!user && <span className="text-xs bg-white/10 px-2 py-1 rounded text-white/60">Modo Invitado</span>}
                </div>


                <div className="flex bg-[var(--color-surface)] p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'active' ? 'bg-[var(--color-secondary)] text-white shadow-lg' : 'text-[var(--color-text-muted)]'}`}
                    >
                        En Proceso ({activeOrders.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'history' ? 'bg-[var(--color-surface)] bg-white/10 text-white' : 'text-[var(--color-text-muted)]'}`}
                    >
                        Historial
                    </button>
                </div>
            </header>

            <main className="px-4 space-y-4">
                {loading ? (
                    <OrderSkeleton />
                ) : displayOrders.length > 0 ? (
                    displayOrders.map(order => {
                        const status = getStatusInfo(order.status)
                        const StatusIcon = status.icon

                        return (
                            <div
                                key={order.id}
                                onClick={() => setSelectedOrderId(order.id)}
                                className="bg-[var(--color-surface)] rounded-2xl p-4 border border-white/5 cursor-pointer hover:border-white/15 hover:bg-white/[0.03] transition-all active:scale-[0.98]"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${status.color} ${status.bg} mb-2`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {status.label}
                                        </div>
                                        <div className="text-xs text-[var(--color-text-muted)] mb-1">
                                            {new Date(order.created_at).toLocaleString()}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]">
                                            {order.order_type === 'delivery' ? (
                                                <><span>🛵 Delivery</span> {order.delivery_address && <span className="text-white/50 truncate max-w-[120px]">({order.delivery_address})</span>}</>
                                            ) : (
                                                <><span>🥡 Retiro en Local</span></>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-xl font-bold">${Number(order.total).toFixed(2)}</span>
                                </div>

                                {/* Items Preview (Show first 2 items) */}
                                <div className="space-y-3 mb-4">
                                    {order.order_items?.map(item => (
                                        <div key={item.id} className="flex gap-3 items-center">
                                            <div className="w-10 h-10 rounded-lg bg-black/20 overflow-hidden flex-shrink-0">
                                                {item.products?.image_url && <img src={item.products.image_url} className="w-full h-full object-cover" />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium leading-tight">{item.products?.name}</p>
                                                {/* Removed Ingredients */}
                                                {item.removed_ingredients?.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {item.removed_ingredients.map((ing, i) => (
                                                            <span key={i} className="text-[9px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full font-bold">
                                                                Sin {ing}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {/* Extras */}
                                                {item.modifiers?.length > 0 && (
                                                    <p className="text-[10px] text-emerald-400/60 mt-0.5">
                                                        {item.modifiers.map(m => `+ ${m.name}${m.quantity > 1 ? ` x${m.quantity}` : ''}`).join(', ')}
                                                    </p>
                                                )}
                                                {item.side_info && (
                                                    <p className="text-[10px] text-[var(--color-text-muted)]">🍟 {item.side_info.name}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {activeTab === 'active' && (
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex-1 bg-white/5 h-1.5 rounded-full overflow-hidden" />
                                        <ChevronRight className="w-4 h-4 text-white/30 ml-2 flex-shrink-0" />
                                    </div>
                                )}

                                {activeTab === 'history' && (
                                    <div className="flex justify-end mt-2">
                                        <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                                            Ver detalle <ChevronRight className="w-3 h-3" />
                                        </span>
                                    </div>
                                )}

                                {order.status === 'sent' && order.order_type === 'delivery' && (
                                    <div className="mt-3 flex items-center gap-2 text-xs font-bold text-orange-400">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                        </span>
                                        Seguimiento en vivo disponible
                                        <ChevronRight className="w-3 h-3 ml-auto" />
                                    </div>
                                )}
                            </div>
                        )
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                        <div className="bg-[var(--color-surface)] border border-white/5 p-8 rounded-3xl shadow-2xl max-w-sm w-full">
                            <div className="w-40 h-40 mx-auto mb-4">
                                <img src={tenantLogo || '/logo-stacked.png'} alt="Logo" className="w-full h-full object-contain drop-shadow-md" />
                            </div>

                            <h2 className="text-2xl font-black uppercase leading-none mb-2 tracking-tighter text-white">
                                {activeTab === 'active' ? 'SIN PEDIDOS ACTIVOS' : 'HISTORIAL VACÍO'}
                            </h2>

                            <p className="text-sm font-bold text-[var(--color-text-muted)] mb-8">
                                {user ? '¡Empiece un nuevo pedido ahora!' : '¡Haz tu primer pedido como invitado!'}
                            </p>

                            <button
                                onClick={() => setIsOrderModalOpen(true)}
                                className="block w-full bg-[var(--color-secondary)] text-white font-black text-lg py-3 rounded-full shadow-md mb-3 hover:bg-orange-600 transition-colors uppercase tracking-wide"
                            >
                                Pide aquí
                            </button>

                            <button
                                onClick={user ? fetchOrders : fetchGuestOrders}
                                className="block w-full bg-transparent border-2 border-white/10 text-white font-black text-lg py-3 rounded-full hover:bg-white/5 transition-colors uppercase tracking-wide"
                            >
                                Actualizar
                            </button>
                        </div>
                    </div>
                )}
            </main>

            <OrderModal isOpen={isOrderModalOpen} onClose={() => setIsOrderModalOpen(false)} />
            <OrderDetailModal
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrderId(null)}
                order={selectedOrder}
            />
            <BottomNav />
        </div>
    )
}

export default MyOrdersPage
