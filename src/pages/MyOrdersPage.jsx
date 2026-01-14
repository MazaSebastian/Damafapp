import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Loader2, Clock, ChefHat, Check, ShoppingBag, ArrowRight, Bell, X, Lock } from 'lucide-react'
import BottomNav from '../components/BottomNav'
import { Link, useNavigate } from 'react-router-dom'
import { OrderSkeleton } from '../components/skeletons/OrderSkeleton'
import LiveTrackingMap from '../components/LiveTrackingMap'
import OrderModal from '../components/OrderModal'

const MyOrdersPage = () => {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('active') // 'active' or 'history'
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)

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

    const fetchOrders = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    products (name, image_url)
                )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (data) setOrders(data)
        setLoading(false)
    }

    const fetchGuestOrders = () => {
        setLoading(true)
        try {
            const guestOrders = JSON.parse(localStorage.getItem('damaf_guest_orders') || '[]')
            setOrders(guestOrders)
        } catch (e) {
            console.error('Error reading guest orders:', e)
            setOrders([])
        }
        setLoading(false)
    }

    const getStatusInfo = (status) => {
        switch (status) {
            case 'pending': return { label: 'Pendiente', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Clock }
            case 'cooking': return { label: 'Cocinando', color: 'text-orange-500', bg: 'bg-orange-500/10', icon: ChefHat }
            case 'packaging': return { label: 'Preparando envío', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: ShoppingBag }
            case 'sent': return { label: 'Pedido Enviado', color: 'text-purple-500', bg: 'bg-purple-500/10', icon: Bell }
            case 'completed': return { label: 'Entregado', color: 'text-gray-400', bg: 'bg-white/5', icon: Check }
            case 'cancelled': return { label: 'Cancelado', color: 'text-red-400', bg: 'bg-red-500/10', icon: X }
            default: return { label: status, color: 'text-gray-400', bg: 'bg-white/5', icon: Clock }
        }
    }

    // Filter orders
    const activeOrders = orders.filter(o => ['paid', 'pending', 'cooking', 'packaging', 'sent'].includes(o.status))
    const historyOrders = orders.filter(o => ['completed', 'cancelled'].includes(o.status))

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
                            <div key={order.id} className="bg-[var(--color-surface)] rounded-2xl p-4 border border-white/5">
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
                                    <span className="text-xl font-bold">${order.total}</span>
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
                                                <p className="text-xs text-[var(--color-text-muted)]">
                                                    {item.modifiers?.length > 0 ? `+ ${item.modifiers.length} extras` : ''}
                                                    {item.side_info ? `, ${item.side_info.name}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {activeTab === 'active' && (
                                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                        {/* Simple Progress Bar - Static for guests unless we simulate it */}
                                    </div>
                                )}

                                {order.status === 'sent' && order.order_type === 'delivery' && (
                                    <div className="mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                        <div className="flex items-center gap-2 mb-2 text-sm font-bold text-orange-400">
                                            <span className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                                            </span>
                                            {user ? 'Seguimiento en Vivo' : 'Seguimiento Limitado'}
                                        </div>

                                        {user ? (
                                            <LiveTrackingMap order={order} />
                                        ) : (
                                            <div className="bg-black/30 rounded-xl p-4 border border-white/10 flex flex-col items-center text-center backdrop-blur-sm relative overflow-hidden group hover:border-orange-500/30 transition-colors">
                                                {/* Blurred Map Background Effect */}
                                                <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/-58.5228,34.5202,13,0/600x300?access_token=pk.eyJ1IjoiZGFtYWZhcHAiLCJhIjoiY2xranR5aDNzMDBiZDN1bnp4Z3h4Z3h6ayJ9.J_f_J_f_J_f')] opacity-20 blur-sm scale-110"></div>

                                                <div className="relative z-10 bg-[var(--color-surface)]/80 p-3 rounded-full mb-2">
                                                    <Lock className="w-6 h-6 text-orange-500" />
                                                </div>
                                                <h3 className="relative z-10 font-bold text-white mb-1">Seguimiento en Vivo Bloqueado</h3>
                                                <p className="relative z-10 text-xs text-white/70 mb-3 max-w-[250px]">
                                                    Solo los usuarios registrados pueden ver la ubicación del repartidor en tiempo real.
                                                </p>
                                                <button
                                                    onClick={() => navigate('/register')}
                                                    className="relative z-10 bg-[var(--color-primary)] text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-purple-700 transition-colors"
                                                >
                                                    Registrarse para ver
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                        <div className="bg-[var(--color-surface)] border border-white/5 p-8 rounded-3xl shadow-2xl max-w-sm w-full">
                            <div className="w-40 h-40 mx-auto mb-4">
                                <img src="/logo-damaf.png" alt="Logo" className="w-full h-full object-contain drop-shadow-md" />
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
            <BottomNav />
        </div>
    )
}

export default MyOrdersPage
