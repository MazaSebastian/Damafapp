import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Loader2, ArrowLeft, X, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import KDSTicket from '../components/kds/KDSTicket'
import useSound from 'use-sound' // Optional: Install if we want sounds, generic notification for now
import { useAuth } from '../context/AuthContext'

const KDSPage = () => {
    const { signOut } = useAuth()
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [newOrderAlert, setNewOrderAlert] = useState(null) // For visual alert modal

    // Debug: Log orders state changes
    useEffect(() => {
        console.log('KDS: Orders state updated:', orders.length, 'orders', orders)
    }, [orders])

    // Sound notification function - Bell sound (3 rings)
    const playNewOrderSound = () => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()

        const playBell = (startTime) => {
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)

            // Bell-like sound (higher frequency with harmonics)
            oscillator.frequency.setValueAtTime(800, startTime)
            oscillator.frequency.exponentialRampToValueAtTime(600, startTime + 0.1)

            // Sharp attack and quick decay like a bell
            gainNode.gain.setValueAtTime(0.6, startTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3)

            oscillator.start(startTime)
            oscillator.stop(startTime + 0.3)
        }

        // Play bell 3 times
        playBell(audioContext.currentTime)
        playBell(audioContext.currentTime + 0.4)
        playBell(audioContext.currentTime + 0.8)
    }

    useEffect(() => {
        console.log('KDS: Component mounted, initializing...')
        fetchKDSOrders()

        const channel = supabase
            .channel('kds_orders')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders'
            }, async (payload) => {
                console.log('KDS: Order event received', payload.eventType, payload.new?.status)

                // Only process if the order is now in cooking status
                if (payload.new?.status === 'cooking') {
                    // Play sound when new order arrives to kitchen or status changes to cooking
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        playNewOrderSound()

                        // Fetch full order details for the alert
                        const { data: fullOrder } = await supabase
                            .from('orders')
                            .select(`
                                *,
                                order_items (
                                    *,
                                    products (name),
                                    modifiers,
                                    side_info,
                                    drink_info
                                ),
                                profiles:user_id (full_name)
                            `)
                            .eq('id', payload.new.id)
                            .single()

                        if (fullOrder) {
                            setNewOrderAlert(fullOrder)
                            // Auto-close after 10 seconds
                            setTimeout(() => setNewOrderAlert(null), 10000)
                        }

                        toast.success('🔥 Nueva comanda en cocina!', {
                            description: `Pedido #${payload.new.id.slice(0, 4)}`
                        })
                    }
                }

                // Always refresh the list to catch status changes
                fetchKDSOrders()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchKDSOrders = async () => {
        try {
            console.log('KDS: Fetching orders with status=cooking...')

            // Fetch full order details including items and customer info
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    order_items (
                        *,
                        products (name),
                        modifiers,
                        side_info,
                        drink_info
                    )
                `)
                .eq('status', 'cooking')
                .order('created_at', { ascending: true })

            if (error) {
                console.error('KDS: Error fetching orders:', error)
                toast.error('Error al cargar pedidos: ' + error.message)
            } else {
                console.log('KDS: Fetched orders (simplified):', data?.length || 0, 'orders', data)
                if (data && data.length > 0) {
                    toast.success(`✅ Encontrados ${data.length} pedidos!`)
                    // For now, just set the orders even without the related data
                    setOrders(data)
                    console.log('KDS: Orders state should update now')
                } else {
                    console.log('KDS: No orders found with status=cooking')
                }
            }
        } catch (err) {
            console.error('KDS: Exception in fetchKDSOrders:', err)
            toast.error('Error crítico al cargar pedidos')
        } finally {
            setLoading(false)
        }
    }

    const handleAdvanceStatus = async (orderId, nextStatus) => {
        // Optimistic UI update could go here

        const { error } = await supabase
            .from('orders')
            .update({ status: nextStatus })
            .eq('id', orderId)

        if (error) {
            toast.error('Error al actualizar estado')
        } else {
            toast.success(`Pedido #${orderId.slice(0, 4)} movido a ${nextStatus}`)
            fetchKDSOrders()
        }
    }

    if (loading) return <div className="h-screen flex items-center justify-center bg-gray-900 text-white"><Loader2 className="animate-spin w-10 h-10 text-orange-500" /></div>

    return (
        <div className="h-screen bg-[var(--color-background)] text-white flex flex-col overflow-hidden font-[var(--font-sans)]">
            {/* New Order Alert Modal */}
            {newOrderAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[var(--color-surface)] rounded-3xl border-4 border-[var(--color-secondary)] shadow-[0_0_60px_rgba(214,67,34,0.6)] max-w-2xl w-full mx-4 animate-in zoom-in duration-300">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[var(--color-secondary)] to-orange-600 p-6 rounded-t-3xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-3xl font-black uppercase tracking-wider flex items-center gap-3">
                                        🔥 NUEVO PEDIDO
                                    </h2>
                                    <p className="text-white/90 text-lg mt-1">Pedido #{newOrderAlert.id.slice(0, 8)}</p>
                                </div>
                                <button
                                    onClick={() => setNewOrderAlert(null)}
                                    className="p-3 bg-white/20 hover:bg-white/30 rounded-2xl transition-all hover:scale-110"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto kds-scrollbar">
                            {/* Customer Info */}
                            <div className="bg-[var(--color-background)] rounded-2xl p-4 border border-white/10">
                                <p className="text-sm text-[var(--color-text-muted)] mb-1">Cliente</p>
                                <p className="text-xl font-bold">{newOrderAlert.profiles?.full_name || 'Invitado'}</p>
                            </div>

                            {/* Order Items */}
                            <div className="space-y-3">
                                <h3 className="text-lg font-bold text-[var(--color-secondary)] uppercase tracking-wide">Items del Pedido</h3>
                                {newOrderAlert.order_items?.map((item, idx) => (
                                    <div key={idx} className="bg-[var(--color-background)] rounded-2xl p-4 border border-white/10">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-2xl font-black">1x {item.products.name}</span>
                                            <span className="text-xl font-bold text-green-400">${item.price_at_time}</span>
                                        </div>

                                        {/* Modifiers */}
                                        {item.modifiers?.length > 0 && (
                                            <div className="mt-3 pl-4 border-l-4 border-[var(--color-secondary)]/30 space-y-1">
                                                <p className="text-xs text-[var(--color-text-muted)] uppercase font-bold mb-1">Modificadores:</p>
                                                {item.modifiers.map((m, i) => (
                                                    <div key={i} className="text-base text-white/90">
                                                        • {m.name} {m.quantity > 1 && <span className="text-[var(--color-secondary)] font-bold">x{m.quantity}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Side & Drink */}
                                        {item.side_info && (
                                            <div className="mt-2 text-sm text-yellow-400 font-medium">
                                                🍟 {item.side_info.name}
                                            </div>
                                        )}
                                        {item.drink_info && (
                                            <div className="mt-2 text-sm text-blue-400 font-medium">
                                                🥤 {item.drink_info.name}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Total */}
                            <div className="bg-gradient-to-r from-green-600/20 to-green-500/20 rounded-2xl p-5 border-2 border-green-500/30">
                                <div className="flex justify-between items-center">
                                    <span className="text-xl font-bold uppercase">Total</span>
                                    <span className="text-4xl font-black text-green-400">${newOrderAlert.total}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-[var(--color-background)]/50 rounded-b-3xl border-t border-white/10">
                            <button
                                onClick={() => setNewOrderAlert(null)}
                                className="w-full py-4 bg-[var(--color-secondary)] hover:bg-orange-600 rounded-2xl font-black text-xl uppercase tracking-wider transition-all hover:scale-[1.02] shadow-lg"
                            >
                                ✓ ENTENDIDO - COMENZAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Bar */}
            <div className="bg-[var(--color-surface)]/90 backdrop-blur-xl px-6 py-5 flex justify-between items-center border-b border-white/5 z-10 shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
                <div className="flex items-center gap-4">
                    <Link to="/admin" className="p-2.5 bg-white/5 rounded-2xl hover:bg-white/10 transition-all duration-200 border border-white/5 hover:border-white/10 hover:scale-105">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-2xl font-black uppercase tracking-wider text-white">
                        KDS <span className="text-[var(--color-secondary)]">Cocina</span>
                    </h1>
                </div>
                <div className="flex gap-3">
                    <div className="px-5 py-2.5 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 text-yellow-400 font-bold text-sm shadow-[0_0_20px_rgba(234,179,8,0.05)] hover:bg-yellow-500/15 transition-all">
                        Pendientes: {orders.filter(o => o.status === 'pending').length}
                    </div>
                    <div className="px-5 py-2.5 bg-[var(--color-secondary)]/10 rounded-2xl border border-[var(--color-secondary)]/20 text-[var(--color-secondary)] font-bold text-sm shadow-[0_0_20px_rgba(214,67,34,0.05)] hover:bg-[var(--color-secondary)]/15 transition-all">
                        En Marcha: {orders.filter(o => o.status === 'cooking').length}
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl border border-red-500/20 transition-all hover:scale-105"
                        title="Cerrar Sesión"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Horizontal Scroll Area */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 kds-scrollbar">
                <div className="flex gap-6 h-full pb-4 items-start snap-x snap-mandatory">
                    {orders.length > 0 ? (
                        orders.map(order => (
                            <KDSTicket
                                key={order.id}
                                order={order}
                                onAdvanceStatus={handleAdvanceStatus}
                            />
                        ))
                    ) : (
                        <div className="w-full h-full flex items-center justify-center flex-col text-[var(--color-text-muted)]">
                            <span className="text-7xl mb-4 opacity-40">😌</span>
                            <span className="text-2xl font-bold uppercase opacity-60">Todo al día</span>
                            <p className="text-sm opacity-40 mt-2">Esperando nuevas comandas...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default KDSPage
