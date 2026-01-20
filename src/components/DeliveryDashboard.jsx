import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { ArrowLeft, RefreshCw, Bike, MapPin, CheckCircle, Clock, ArrowUp, ArrowDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import LiveFleetMap from './LiveFleetMap'

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
            // Order by custom sequence if exists, then by time
            .order('delivery_order', { ascending: true })
            .order('created_at', { ascending: true })

        if (data) setOrders(data)
        setLoading(false)
    }

    const moveOrder = async (orderId, direction) => {
        // Find current index in the FULL list or just the 'ready' list? 
        // We really want to reorder the GLOBAL sequence, but for UI we usually just reorder the visible list.
        // Let's assume we reorder within the 'readyOrders' arrays roughly.
        // Simple swap logic implementation for MVP:

        const currentIndex = readyOrders.findIndex(o => o.id === orderId)
        if (currentIndex === -1) return

        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
        if (newIndex < 0 || newIndex >= readyOrders.length) return

        const targetOrder = readyOrders[newIndex]

        // Swap 'delivery_order' values
        // If delivery_order is null, we assume they are 0. We might need to initialize them.
        const currentOrderVal = readyOrders[currentIndex].delivery_order || 0
        const targetOrderVal = targetOrder.delivery_order || 0

        // If equal (both 0), we need to create divergence.
        // Quick fix: Set current to newIndex and target to currentIndex (if we assume array index maps to order)
        // Better: Just swap their IDs in a 'sequence' map? No, update DB.

        // Let's just swap the values directly. If they are equal, we force a difference.
        let newCurrentVal = targetOrderVal
        let newTargetVal = currentOrderVal

        if (currentOrderVal === targetOrderVal) {
            // If collision (common if new), prioritize explicit ordering
            newCurrentVal = direction === 'up' ? currentOrderVal - 1 : currentOrderVal + 1
            // This might conflict with others, but for MVP it nudges it. 
            // Ideally we run a "normalize" script to set 1, 2, 3...
        }

        // Perform updates
        await supabase.from('orders').update({ delivery_order: newCurrentVal }).eq('id', orderId)
        await supabase.from('orders').update({ delivery_order: newTargetVal }).eq('id', targetOrder.id)

        // Optimistic update locally? Or just wait for realtime? Realtime is fast enough usually.
        // toast.success('Reordenando...')
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
        <div className="min-h-screen bg-[var(--color-background)] text-white p-4 md:p-8 font-sans">
            {/* Header */}
            <header className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <Link to="/admin" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Bike className="text-purple-400" />
                            Centro de Logística
                        </h1>
                        <p className="text-[var(--color-text-muted)] text-sm">Gestión de envíos en tiempo real</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="hidden md:flex gap-8 px-6 py-2 bg-[var(--color-surface)] rounded-full border border-white/5">
                        <div className="text-center">
                            <span className="block text-2xl font-bold text-white">{readyOrders.length}</span>
                            <span className="text-xs text-[var(--color-text-muted)] uppercase">Pendientes</span>
                        </div>
                        <div className="bg-white/5 w-px h-full"></div>
                        <div className="text-center">
                            <span className="block text-2xl font-bold text-white">{inTransitOrders.length}</span>
                            <span className="text-xs text-[var(--color-text-muted)] uppercase">En Calle</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">

                {/* Column: Ready for Dispatch */}
                <div className="bg-[var(--color-surface)] rounded-2xl p-4 flex flex-col border border-white/5 lg:col-span-1 shadow-lg">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 pb-2 border-b border-white/5 text-white">
                        <Clock className="w-5 h-5 text-purple-400" />
                        Listos para Salir
                    </h2>

                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                        <AnimatePresence>
                            {readyOrders.map((order, idx) => (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    className="bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors relative group"
                                >
                                    {/* Reorder Buttons */}
                                    <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => moveOrder(order.id, 'up')}
                                            disabled={idx === 0}
                                            className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                                        >
                                            <ArrowUp className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => moveOrder(order.id, 'down')}
                                            disabled={idx === readyOrders.length - 1}
                                            className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                                        >
                                            <ArrowDown className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="flex justify-between items-start mb-2 pr-6">
                                        <span className="font-mono font-bold text-lg text-white">#{order.id.slice(0, 6)}</span>
                                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded font-bold">
                                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <div className="flex items-start gap-2 mb-4 text-sm text-[var(--color-text-muted)]">
                                        <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-purple-400" />
                                        <span className="leading-tight">{order.delivery_address}</span>
                                    </div>

                                    <div className="flex gap-2 items-center">
                                        {/* Simple Driver Input for Phase 1 */}
                                        <input
                                            type="text"
                                            placeholder="Repartidor..."
                                            className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-purple-500 text-white placeholder:text-white/20"
                                            defaultValue={order.driver_name || ''}
                                            onBlur={(e) => {
                                                if (e.target.value !== order.driver_name) {
                                                    assignDriver(order.id, e.target.value)
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={() => {
                                                if (!order.driver_name) {
                                                    toast.error('⚠️ Debes asignar un repartidor primero')
                                                    return
                                                }
                                                markAsSent(order.id)
                                            }}
                                            className={`px-3 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition-colors shadow-lg 
                                                ${!order.driver_name
                                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed border border-white/5 opacity-50'
                                                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/20'
                                                }`}
                                        >
                                            DESPACHAR
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                            {readyOrders.length === 0 && (
                                <div className="text-center py-10 text-[var(--color-text-muted)] italic">No hay pedidos esperando.</div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Column: In Transit & Map - Wider */}
                <div className="bg-[var(--color-surface)] rounded-2xl p-4 flex flex-col border border-white/5 lg:col-span-2 shadow-lg">
                    <h2 className="text-lg font-bold mb-4 flex items-center justify-between pb-2 border-b border-white/5 text-white">
                        <div className="flex items-center gap-2">
                            <Bike className="w-5 h-5 text-blue-400" />
                            En Camino · Mapa en Vivo
                        </div>
                        <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full border border-blue-500/20">
                            {inTransitOrders.length} activos
                        </span>
                    </h2>

                    {/* Integrated Map */}
                    <div className="h-64 md:h-80 w-full rounded-xl overflow-hidden border border-white/10 mb-6 bg-black/50 shadow-inner">
                        <LiveFleetMap activeOrders={inTransitOrders} />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                        <AnimatePresence>
                            {inTransitOrders.map(order => (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: 100 }}
                                    className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <div>
                                                <span className="font-mono font-bold text-lg block text-white">#{order.id.slice(0, 6)}</span>
                                                <span className="text-xs text-blue-300 font-bold flex items-center gap-1">
                                                    <Bike className="w-3 h-3" /> {order.driver_name || 'Sin asignar'}
                                                </span>
                                            </div>
                                            <span className="font-bold text-xl text-white">${order.total}</span>
                                        </div>

                                        <div className="flex items-start gap-2 text-sm text-[var(--color-text-muted)]">
                                            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" />
                                            <span className="leading-tight">{order.delivery_address}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => markAsDelivered(order.id)}
                                        className="w-full md:w-auto bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white border border-green-500/30 py-3 md:py-2 px-6 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                                    >
                                        <CheckCircle className="w-4 h-4" /> CONFIRMAR
                                    </button>
                                </motion.div>
                            ))}
                            {inTransitOrders.length === 0 && (
                                <div className="text-center py-4 text-[var(--color-text-muted)] italic">No hay repartos en curso.</div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default DeliveryDashboard
