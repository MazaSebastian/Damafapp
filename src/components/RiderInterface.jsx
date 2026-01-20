import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { Bike, MapPin, Navigation, Power, CheckCircle, Clock, Smartphone, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

const RiderInterface = () => {
    const [activeOrderId, setActiveOrderId] = useState(null)
    const [isTracking, setIsTracking] = useState(false)
    const [orders, setOrders] = useState([])
    const watchIdRef = useRef(null)

    // Fetch assigned orders
    useEffect(() => {
        fetchAssignedOrders()

        const channel = supabase
            .channel('rider_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchAssignedOrders)
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [])

    const fetchAssignedOrders = async () => {
        // Fetch orders assigned to rider (simulated for now by showing all 'assigned'/'picked_up')
        const { data } = await supabase
            .from('orders')
            .select('*')
            .in('delivery_status', ['assigned', 'picked_up'])
            // Ideally order by a 'delivery_sequence' or created_at
            .order('created_at', { ascending: true })

        if (data) {
            setOrders(data)
            // Restore active tracking session if local state matches (optional enhancement later)
            const active = data.find(o => o.delivery_status === 'picked_up')
            if (active) {
                setActiveOrderId(active.id)
            }
        }
    }

    const startTracking = (orderId) => {
        if (!navigator.geolocation) {
            toast.error('GPS no soportado en este dispositivo')
            return
        }

        setActiveOrderId(orderId)
        setIsTracking(true)
        toast.info('🚀 Iniciando viaje...')

        // Update status to 'picked_up'
        supabase.from('orders').update({ delivery_status: 'picked_up' }).eq('id', orderId).then()

        watchIdRef.current = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords
                // console.log('📍 Sending position:', latitude, longitude)

                const { error } = await supabase
                    .from('orders')
                    .update({
                        driver_lat: latitude,
                        driver_lng: longitude,
                        last_location_update: new Date()
                    })
                    .eq('id', orderId)

                if (error) console.error('GPS Upload Error', error)
            },
            (error) => {
                console.error(error)
                toast.error('Error de GPS: ' + error.message)
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        )
    }

    const stopTracking = async () => {
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current)
            watchIdRef.current = null
        }
        setIsTracking(false)
        setActiveOrderId(null)
    }

    const markDelivered = async (orderId) => {
        const order = orders.find(o => o.id === orderId)
        if (!confirm(`¿Confirmar entrega de Pedido #${orderId.slice(0, 4)}?`)) return

        stopTracking()
        toast.message('Finalizando pedido...')

        // 1. Update Order Status
        const { error } = await supabase
            .from('orders')
            .update({
                status: 'completed',
                delivery_status: 'delivered',
                active: false // Archive it
            })
            .eq('id', orderId)

        if (!error) {
            toast.success('¡Excelente trabajo! Pedido entregado 🏁')

            // 2. Log Cash Transaction Automatically
            if (order) {
                // Dynamically import to avoid top-level await issues if bundler is strict
                const { logCashSale } = await import('../utils/cashUtils')
                await logCashSale(orderId, order.total, order.payment_method, supabase)
            }

            // Refresh list immediately
            fetchAssignedOrders()
        } else {
            toast.error('Error al finalizar pedido')
        }
    }

    return (
        <div className="min-h-screen bg-[var(--color-background)] text-white pb-24 font-sans selection:bg-purple-500/30">
            {/* Header */}
            <header className="bg-[var(--color-surface)] border-b border-white/5 sticky top-0 z-50 shadow-lg">
                <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-xl text-white">
                            <Bike className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black tracking-tight leading-none">Damaf Drivers</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-green-500/50'}`}></span>
                                <p className="text-xs text-[var(--color-text-muted)] font-medium">
                                    {isTracking ? 'En Ruta' : 'En Línea'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-6 space-y-6">

                {/* Active Order Highlight */}
                {activeOrderId && (
                    <div className="bg-[var(--color-surface)] border border-purple-500/30 p-1 rounded-2xl animate-in slide-in-from-top duration-500 shadow-xl">
                        <div className="bg-black/20 rounded-xl p-5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10">
                                <Navigation className="w-24 h-24 text-white" />
                            </div>

                            <h2 className="text-purple-300 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                                <span className="animate-pulse">●</span> Pedido en Curso
                            </h2>

                            {orders.find(o => o.id === activeOrderId) && (
                                <>
                                    <div className="text-3xl font-black mb-1">
                                        #{orders.find(o => o.id === activeOrderId).id.slice(0, 4)}
                                    </div>
                                    <p className="text-[var(--color-text-muted)] text-sm line-clamp-2 mb-6 w-3/4">
                                        {orders.find(o => o.id === activeOrderId).delivery_address}
                                    </p>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => {
                                                const addr = orders.find(o => o.id === activeOrderId).delivery_address
                                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`, '_blank')
                                            }}
                                            className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border border-white/5"
                                        >
                                            <Navigation className="w-4 h-4" /> Waze / Maps
                                        </button>
                                        <button
                                            onClick={() => markDelivered(activeOrderId)}
                                            className="bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 transition-all"
                                        >
                                            <CheckCircle className="w-4 h-4" /> Entregado
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Orders List */}
                <div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                        <Clock className="w-5 h-5 text-purple-300" />
                        Próximas Entregas
                        <span className="bg-white/10 text-xs py-0.5 px-2 rounded-full text-[var(--color-text-muted)]">
                            {orders.filter(o => o.id !== activeOrderId).length}
                        </span>
                    </h3>

                    <div className="space-y-4">
                        {orders.length === 0 && (
                            <div className="text-center py-12 px-6 bg-[var(--color-surface)] rounded-2xl border border-white/5 border-dashed">
                                <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Clock className="w-8 h-8 text-white/50" />
                                </div>
                                <h4 className="text-white font-bold mb-1">Todo listo por ahora</h4>
                                <p className="text-[var(--color-text-muted)] text-sm">Espera a que te asignen nuevos pedidos.</p>
                            </div>
                        )}

                        {orders.filter(o => o.id !== activeOrderId).map((order, idx) => (
                            <motion.div
                                key={order.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-[var(--color-surface)] p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all active:scale-[0.98] shadow-md"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/10 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border border-white/10">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="font-black text-xl tracking-tight">#{order.id.slice(0, 4)}</div>
                                            <div className="text-xs text-[var(--color-text-muted)] font-mono">
                                                {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-lg">${order.total}</div>
                                        <div className={`text-xs px-2 py-0.5 rounded uppercase font-bold ${order.payment_method === 'cash' ? 'bg-green-500/20 text-green-300' : 'bg-purple-500/20 text-purple-300'
                                            }`}>
                                            {order.payment_method === 'cash' ? 'Efectivo' : 'MP / Transf'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 mb-5 pl-1">
                                    <div className="w-px h-8 bg-gradient-to-b from-gray-500 to-transparent mx-2"></div>
                                    <p className="text-[var(--color-text-muted)] text-sm leading-snug">
                                        {order.delivery_address}
                                    </p>
                                </div>

                                <button
                                    onClick={() => isTracking ? toast.warning('Termina el pedido actual antes de iniciar otro.') : startTracking(order.id)}
                                    disabled={isTracking}
                                    className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all group
                                        ${isTracking
                                            ? 'bg-black/20 text-[var(--color-text-muted)] cursor-not-allowed'
                                            : 'bg-white text-[var(--color-primary)] hover:bg-gray-100 shadow-lg'
                                        }
                                    `}
                                >
                                    {isTracking ? 'Viaje en Curso...' : (
                                        <>
                                            Iniciar Ruta <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    )
}

export default RiderInterface
