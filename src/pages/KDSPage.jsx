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
                filter: 'status=in.(pending,cooking)'
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
            .in('status', ['pending', 'cooking'])
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
        <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
            {/* Simple Top Bar */}
            <div className="bg-black/40 backdrop-blur-md p-4 flex justify-between items-center border-b border-white/5 z-10">
                <div className="flex items-center gap-4">
                    <Link to="/admin" className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-black uppercase tracking-widest text-[var(--color-secondary)]">KDS Cocina</h1>
                </div>
                <div className="flex gap-4">
                    <div className="px-4 py-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20 text-yellow-500 font-bold">
                        Pendientes: {orders.filter(o => o.status === 'pending').length}
                    </div>
                    <div className="px-4 py-2 bg-orange-500/10 rounded-lg border border-orange-500/20 text-orange-500 font-bold">
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
