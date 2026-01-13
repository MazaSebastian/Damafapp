import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { ArrowLeft, RefreshCw, Bike, MapPin, CheckCircle, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

const DeliveryDashboard = () => {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)

    // Filtered lists
    const readyOrders = orders.filter(o => o.status === 'packaging' && o.order_type === 'delivery')
    const inTransitOrders = orders.filter(o => o.status === 'sent' && o.order_type === 'delivery')

    useEffect(() => {
        fetchOrders()

        // Realtime Subscription
        const channel = supabase
            .channel('delivery_dashboard_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchOrders = async () => {
        const { data, error } = await supabase
            .from('orders')
            .select(`*, order_items(*, products(name))`)
            .in('status', ['packaging', 'sent']) // Fetch only relevant statuses
            .eq('order_type', 'delivery')
            .order('created_at', { ascending: true }) // Oldest first for dispatch

        if (data) setOrders(data)
        setLoading(false)
    }

    const assignDriver = async (orderId, driverName) => {
        const { error } = await supabase
            .from('orders')
            .update({
                driver_name: driverName,
                delivery_status: 'assigned'
            })
            .eq('id', orderId)

        if (error) toast.error('Error al asignar repartidor')
        else toast.success('Repartidor asignado')
    }

    const markAsSent = async (orderId) => {
        const { error } = await supabase
            .from('orders')
            .update({
                status: 'sent',
                delivery_status: 'picked_up',
                delivery_started_at: new Date()
            })
            .eq('id', orderId)

        if (error) toast.error('Error al actualizar estado')
        else toast.success('Pedido marcado EN CAMINO 🛵')
    }

    const markAsDelivered = async (orderId) => {
        if (!confirm('¿Confirmar entrega exitosa?')) return

        const { error } = await supabase
            .from('orders')
            .update({
                status: 'completed',
                delivery_status: 'delivered'
            })
            .eq('id', orderId)

        if (error) toast.error('Error al finalizar pedido')
        else toast.success('Pedido ENTREGADO ✅')
    }

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white p-4 md:p-8">
            {/* Header */}
            <header className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <Link to="/admin" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Bike className="text-[var(--color-secondary)]" />
                            Centro de Logística
                        </h1>
                        <p className="text-[var(--color-text-muted)] text-sm">Gestión de envíos en tiempo real</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="hidden md:flex gap-8 px-6 py-2 bg-white/5 rounded-full border border-white/10">
                        <div className="text-center">
                            <span className="block text-2xl font-bold text-orange-400">{readyOrders.length}</span>
                            <span className="text-xs text-[var(--color-text-muted)] uppercase">Pendientes</span>
                        </div>
                        <div className="bg-white/10 w-px h-full"></div>
                        <div className="text-center">
                            <span className="block text-2xl font-bold text-blue-400">{inTransitOrders.length}</span>
                            <span className="text-xs text-[var(--color-text-muted)] uppercase">En Calle</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100vh-140px)]">

                {/* Column: Ready for Dispatch */}
                <div className="bg-[#1a1a1a] rounded-2xl p-4 flex flex-col border border-white/5">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 pb-2 border-b border-white/5 text-orange-400">
                        <Clock className="w-5 h-5" />
                        Listos para Salir
                    </h2>

                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                        <AnimatePresence>
                            {readyOrders.map(order => (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    className="bg-[#252525] p-4 rounded-xl border-l-4 border-orange-500 hover:bg-[#2a2a2a] transition-colors"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-mono font-bold text-lg">#{order.id.slice(0, 6)}</span>
                                        <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">
                                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <div className="flex items-start gap-2 mb-3 text-sm text-gray-300">
                                        <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-500" />
                                        <span className="leading-tight">{order.delivery_address}</span>
                                    </div>

                                    <div className="flex gap-2 items-center">
                                        {/* Simple Driver Input for Phase 1 */}
                                        <input
                                            type="text"
                                            placeholder="Repartidor..."
                                            className="bg-black/30 border border-white/10 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-orange-500"
                                            defaultValue={order.driver_name || ''}
                                            onBlur={(e) => {
                                                if (e.target.value !== order.driver_name) {
                                                    assignDriver(order.id, e.target.value)
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={() => markAsSent(order.id)}
                                            className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-colors"
                                        >
                                            DESPACHAR ➡️
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                            {readyOrders.length === 0 && (
                                <div className="text-center py-10 text-gray-600 italic">No hay pedidos esperando.</div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Column: In Transit */}
                <div className="bg-[#1a1a1a] rounded-2xl p-4 flex flex-col border border-white/5">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 pb-2 border-b border-white/5 text-blue-400">
                        <Bike className="w-5 h-5" />
                        En Camino
                    </h2>

                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                        <AnimatePresence>
                            {inTransitOrders.map(order => (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: 100 }}
                                    className="bg-[#252525] p-4 rounded-xl border-l-4 border-blue-500"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="font-mono font-bold text-lg block">#{order.id.slice(0, 6)}</span>
                                            <span className="text-xs text-blue-400 font-bold flex items-center gap-1">
                                                <Bike className="w-3 h-3" /> {order.driver_name || 'Sin asignar'}
                                            </span>
                                        </div>
                                        <span className="font-bold text-xl">${order.total}</span>
                                    </div>

                                    <div className="flex items-start gap-2 mb-4 text-sm text-gray-300">
                                        <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-500" />
                                        <span className="leading-tight">{order.delivery_address}</span>
                                    </div>

                                    <button
                                        onClick={() => markAsDelivered(order.id)}
                                        className="w-full bg-green-600/20 hover:bg-green-600 text-green-500 hover:text-white border border-green-600/50 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle className="w-4 h-4" /> CONFIRMAR ENTREGA
                                    </button>
                                </motion.div>
                            ))}
                            {inTransitOrders.length === 0 && (
                                <div className="text-center py-10 text-gray-600 italic">No hay repartos en curso.</div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default DeliveryDashboard
