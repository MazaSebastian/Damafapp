import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Loader2, Clock, ChefHat, Check, ShoppingBag, ArrowRight } from 'lucide-react' // Added ArrowRight import
import BottomNav from '../components/BottomNav'
import { Link } from 'react-router-dom'
import { OrderSkeleton } from '../components/skeletons/OrderSkeleton'

const MyOrdersPage = () => {
    const { user } = useAuth()
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('active') // 'active' or 'history'

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
            setLoading(false)
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
    const activeOrders = orders.filter(o => ['pending', 'cooking', 'packaging', 'sent'].includes(o.status))
    const historyOrders = orders.filter(o => ['completed', 'cancelled'].includes(o.status))

    const displayOrders = activeTab === 'active' ? activeOrders : historyOrders

    if (!user) return (
        <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4">
            <div className="text-center">
                <p className="mb-4">Inicia sesión para ver tus pedidos</p>
                <Link to="/login" className="bg-[var(--color-primary)] px-6 py-2 rounded-full font-bold">Ir a Login</Link>
            </div>
            <BottomNav />
        </div>
    )

    return (
        <div className="min-h-screen bg-[var(--color-background)] pb-24">
            <header className="p-4 pt-8">
                <h1 className="text-2xl font-bold mb-6">Mis Pedidos</h1>

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
                                        <div
                                            className="h-full bg-[var(--color-secondary)] transition-all duration-1000 animate-pulse"
                                            style={{
                                                width: order.status === 'pending' ? '10%' :
                                                    order.status === 'cooking' ? '30%' :
                                                        order.status === 'packaging' ? '60%' :
                                                            order.status === 'sent' ? '90%' : '100%'
                                            }}
                                        ></div>
                                    </div>
                                )}
                            </div>
                        )
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                        <div className="bg-white text-black p-8 rounded-3xl shadow-2xl max-w-sm w-full">
                            <div className="w-24 h-24 mx-auto mb-6">
                                <img src="/logo-damaf.png" alt="Logo" className="w-full h-full object-contain drop-shadow-sm invert brightness-0" />
                            </div>

                            <h2 className="text-2xl font-black uppercase leading-none mb-2 tracking-tighter text-[#502314]">
                                LOS PEDIDOS Y ARTÍCULOS RECIENTES APARECERÁN AQUÍ
                            </h2>

                            <p className="text-sm font-bold text-[#502314]/70 mb-8">
                                ¡Empiece un nuevo pedido ahora!
                            </p>

                            <Link
                                to="/menu"
                                className="block w-full bg-[#d62300] text-white font-black text-lg py-3 rounded-full shadow-md mb-3 hover:bg-[#b01d00] transition-colors uppercase tracking-wide"
                            >
                                Pide aquí
                            </Link>

                            <button
                                onClick={fetchOrders}
                                className="block w-full bg-transparent border-2 border-[#d62300] text-[#d62300] font-black text-lg py-3 rounded-full hover:bg-[#d62300]/5 transition-colors uppercase tracking-wide"
                            >
                                Actualizar
                            </button>
                        </div>
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    )
}

export default MyOrdersPage
