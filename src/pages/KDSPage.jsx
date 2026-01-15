import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Loader2, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import KDSTicket from '../components/kds/KDSTicket'
import useSound from 'use-sound' // Optional: Install if we want sounds, generic notification for now

const KDSPage = () => {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchKDSOrders()

        const channel = supabase
            .channel('kds_orders')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: 'status=in.(cooking)'
            }, () => {
                // Ideally we check payload to play sound if INSERT
                // For now, simple refetch
                fetchKDSOrders()
                // playSound()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchKDSOrders = async () => {
        const { data } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    products (name) 
                ),
                profiles:user_id (full_name)
            `)
            .in('status', ['cooking'])
            .order('created_at', { ascending: true }) // Oldest first (FIFO)

        if (data) setOrders(data)
        setLoading(false)
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
            {/* Simple Top Bar */}
            <div className="bg-[var(--color-surface)]/80 backdrop-blur-xl p-4 flex justify-between items-center border-b border-white/10 z-10 shadow-lg">
                <div className="flex items-center gap-4">
                    <Link to="/admin" className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/5">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-black uppercase tracking-widest text-white drop-shadow-md">
                        KDS <span className="text-[var(--color-secondary)]">Cocina</span>
                    </h1>
                </div>
                <div className="flex gap-4">
                    <div className="px-4 py-2 bg-yellow-500/20 rounded-xl border border-yellow-500/30 text-yellow-400 font-bold shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                        Pendientes: {orders.filter(o => o.status === 'pending').length}
                    </div>
                    <div className="px-4 py-2 bg-[var(--color-secondary)]/20 rounded-xl border border-[var(--color-secondary)]/30 text-[var(--color-secondary)] font-bold shadow-[0_0_15px_rgba(214,67,34,0.1)]">
                        En Marcha: {orders.filter(o => o.status === 'cooking').length}
                    </div>
                </div>
            </div>

            {/* Horizontal Scroll Area */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
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
                        <div className="w-full h-full flex items-center justify-center flex-col text-[var(--color-text-muted)] opacity-50">
                            <span className="text-6xl mb-4">😌</span>
                            <span className="text-2xl font-bold uppercase">Todo al día</span>
                            <p>Esperando nuevas comandas...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default KDSPage
