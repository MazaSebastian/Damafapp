import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { Bike, MapPin, Navigation, Power, CheckCircle } from 'lucide-react'
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
        // In a real app, we would filter by the logged-in driver's ID.
        // For MVP/Demo, we fetch ALL orders marked as 'assigned' or 'picked_up' without a specific driver filter
        // or assuming the user "claims" them by name in the dashboard.

        // Let's assume we show ALL "En Camino" orders that need tracking
        const { data } = await supabase
            .from('orders')
            .select('*')
            .in('delivery_status', ['assigned', 'picked_up'])
            .order('created_at', { ascending: false })

        if (data) setOrders(data)
    }

    const startTracking = (orderId) => {
        if (!navigator.geolocation) {
            toast.error('GPS no soportado')
            return
        }

        setActiveOrderId(orderId)
        setIsTracking(true)
        toast.success('📍 Iniciando transmisión de GPS...')

        // Update status to 'picked_up' if not already
        supabase.from('orders').update({ delivery_status: 'picked_up' }).eq('id', orderId).then()

        watchIdRef.current = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords
                console.log('📍 Sending position:', latitude, longitude)

                // Update DB with optimized throttle might be better, but direct verify for now
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
            (error) => console.error(error),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        )
    }

    const stopTracking = async () => {
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current)
            watchIdRef.current = null
        }
        setIsTracking(false)
        setActiveOrderId(null)
        toast('🛑 Transmisión detenida')
    }

    const markDelivered = async (orderId) => {
        stopTracking()
        const { error } = await supabase
            .from('orders')
            .update({ status: 'completed', delivery_status: 'delivered' })
            .eq('id', orderId)

        if (!error) toast.success('Pedido entregado ✅')
    }

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-24">
            <header className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <Bike className="w-8 h-8 text-[var(--color-secondary)]" />
                    <h1 className="text-xl font-bold">App Repartidor</h1>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${isTracking ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                    {isTracking ? 'GPS ACTIVO' : 'GPS OFF'}
                </div>
            </header>

            <div className="space-y-4">
                <h2 className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-2">Pedidos Asignados</h2>

                {orders.length === 0 && (
                    <div className="text-center py-10 text-gray-600 bg-[#1a1a1a] rounded-xl border border-white/5">
                        <Bike className="w-10 h-10 mx-auto mb-4 opacity-20" />
                        <p>No tienes pedidos activos.</p>
                        <p className="text-xs mt-2">Espera a que te asignen uno en el local.</p>
                    </div>
                )}

                {orders.map(order => (
                    <div key={order.id} className={`bg-[#1a1a1a] rounded-xl overflow-hidden border ${activeOrderId === order.id ? 'border-green-500 box-shadow-green' : 'border-white/10'}`}>
                        {/* Map Header Sim */}
                        <div className="h-20 bg-gray-800 relative">
                            {/* In real app, show mini map per order or google maps link */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                <MapPin className="w-8 h-8" />
                            </div>
                            <button
                                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.delivery_address)}`, '_blank')}
                                className="absolute bottom-2 right-2 bg-blue-600 text-white p-2 rounded-full shadow-lg text-xs font-bold flex items-center gap-1"
                            >
                                <Navigation className="w-4 h-4" /> IR
                            </button>
                        </div>

                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-lg font-bold">#{order.id.slice(0, 6)}</span>
                                <span className="text-xs bg-white/10 px-2 py-1 rounded text-orange-400 font-mono">
                                    {order.driver_name || 'Sin Chofer'}
                                </span>
                            </div>
                            <p className="text-gray-300 text-sm mb-4 flex items-start gap-2">
                                <MapPin className="w-4 h-4 mt-0.5 text-gray-500" />
                                {order.delivery_address}
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                {!isTracking || activeOrderId !== order.id ? (
                                    <button
                                        onClick={() => startTracking(order.id)}
                                        disabled={isTracking && activeOrderId !== order.id}
                                        className="col-span-2 bg-[var(--color-secondary)] hover:bg-orange-600 text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                                    >
                                        <Power className="w-4 h-4" /> INICIAR VIAJE
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={stopTracking}
                                            className="bg-red-500/20 text-red-500 py-3 rounded-lg font-bold text-sm hover:bg-red-500/30"
                                        >
                                            PAUSAR GPS
                                        </button>
                                        <button
                                            onClick={() => markDelivered(order.id)}
                                            className="bg-green-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-green-500 flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle className="w-4 h-4" /> ENTREGADO
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default RiderInterface
