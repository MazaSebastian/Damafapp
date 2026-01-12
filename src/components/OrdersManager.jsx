import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Loader2, Check, Clock, X, ChefHat, Bell, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const OrdersManager = () => {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchOrders()

        // Subscription for real-time updates
        const channel = supabase
            .channel('orders_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchOrders = async () => {
        const { data: ordersData, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    products (name) 
                )
            `)
            .order('created_at', { ascending: false })

        if (ordersData) setOrders(ordersData)
        setLoading(false)
    }

    const updateStatus = async (orderId, newStatus) => {
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId)

        if (!error) {
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
            toast.success(`Pedido actualizado a: ${newStatus}`)
        } else {
            console.error('Error updating status:', error)
            toast.error('Error al actualizar estado')
        }
    }

    const deleteOrder = (orderId) => {
        toast('¿Eliminar pedido permanentemente?', {
            description: 'Esta acción no se puede deshacer.',
            action: {
                label: 'Eliminar',
                onClick: async () => {
                    const { error } = await supabase
                        .from('orders')
                        .delete()
                        .eq('id', orderId)

                    if (!error) {
                        setOrders(prev => prev.filter(o => o.id !== orderId))
                        toast.success('Pedido eliminado')
                    } else {
                        console.error('Error deleting order:', error)
                        toast.error('Error al eliminar pedido')
                    }
                }
            },
            cancel: {
                label: 'Cancelar'
            }
        })
    }

    const clearHistory = () => {
        toast('¿Limpiar historial completo?', {
            description: 'Se borrarán todos los pedidos finalizados y cancelados.',
            action: {
                label: 'Confirmar Limpieza',
                onClick: async () => {
                    setLoading(true)
                    const { error } = await supabase
                        .from('orders')
                        .delete()
                        .in('status', ['completed', 'cancelled', 'rejected'])

                    if (!error) {
                        await fetchOrders()
                        toast.success('Historial limpio')
                    } else {
                        console.error('Error clearing history:', error)
                        toast.error('Error al limpiar historial')
                    }
                    setLoading(false)
                }
            },
            cancel: {
                label: 'Cancelar'
            }
        })
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500/20 text-yellow-500'
            case 'cooking': return 'bg-orange-500/20 text-orange-500'
            case 'packaging': return 'bg-blue-500/20 text-blue-500'
            case 'sent': return 'bg-purple-500/20 text-purple-500'
            case 'completed': return 'bg-gray-500/20 text-gray-400'
            case 'cancelled':
            case 'rejected': return 'bg-red-500/20 text-red-500'
            default: return 'bg-gray-500/20 text-gray-400'
        }
    }

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[var(--color-secondary)]" /></div>

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <ChefHat className="text-[var(--color-secondary)]" />
                    Gestión de Pedidos
                </h2>
                <button
                    onClick={clearHistory}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-medium transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                    Limpiar Completados
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {orders.map(order => (
                    <div key={order.id} className="bg-[var(--color-surface)] rounded-2xl border border-white/5 overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 bg-[var(--color-background)]/50 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold">#{order.id.slice(0, 8)}</span>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${getStatusColor(order.status)}`}>
                                        {order.status}
                                    </span>
                                </div>
                                <span className="text-xs text-[var(--color-text-muted)]">
                                    {new Date(order.created_at).toLocaleString()}
                                </span>
                                {order.order_type === 'delivery' ? (
                                    <div className="flex items-center gap-1 mt-1 text-xs text-blue-400 font-medium">
                                        <Bell className="w-3 h-3" /> Delivery
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 mt-1 text-xs text-green-400 font-medium">
                                        <ChefHat className="w-3 h-3" /> Take Away
                                    </div>
                                )}
                                {order.delivery_address && (
                                    <div className="text-xs text-white/70 italic mt-0.5 max-w-[150px] truncate">
                                        📍 {order.delivery_address}
                                    </div>
                                )}
                            </div>
                            <div className="text-right">
                                <span className="font-bold text-lg block">${order.total}</span>
                                <button
                                    onClick={() => deleteOrder(order.id)}
                                    className="text-[var(--color-text-muted)] hover:text-red-400 mt-1"
                                    title="Eliminar pedido"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="p-4 flex-1 space-y-3">
                            {order.order_items?.map(item => (
                                <div key={item.id} className="text-sm">
                                    <div className="flex justify-between font-medium">
                                        <span>1x {item.products?.name}</span>
                                        <span className="text-[var(--color-text-muted)]">${item.price_at_time}</span>
                                    </div>

                                    {/* Sub-items details */}
                                    <div className="pl-4 border-l border-white/10 mt-1 text-xs text-[var(--color-text-muted)] space-y-0.5">
                                        {item.modifiers?.map((m, i) => (
                                            <div key={i}>+ {m.name}</div>
                                        ))}
                                        {item.side_info && <div>+ {item.side_info.name}</div>}
                                        {item.drink_info && <div>+ {item.drink_info.name}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="p-3 bg-[var(--color-background)]/30 grid grid-cols-3 gap-2">
                            {order.status === 'pending' && (
                                <button onClick={() => updateStatus(order.id, 'cooking')} className="col-span-3 bg-orange-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-orange-500 transition-colors flex items-center justify-center gap-2">
                                    <ChefHat className="w-4 h-4" /> Empezar a Cocinar
                                </button>
                            )}
                            {order.status === 'cooking' && (
                                <button onClick={() => updateStatus(order.id, 'packaging')} className="col-span-3 bg-blue-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-blue-500 transition-colors flex items-center justify-center gap-2">
                                    <Check className="w-4 h-4" /> Preparar Envío
                                </button>
                            )}
                            {order.status === 'packaging' && (
                                <button onClick={() => updateStatus(order.id, 'sent')} className="col-span-3 bg-purple-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-purple-500 transition-colors flex items-center justify-center gap-2">
                                    <Bell className="w-4 h-4" /> Enviar Pedido
                                </button>
                            )}
                            {order.status === 'sent' && (
                                <button onClick={() => updateStatus(order.id, 'completed')} className="col-span-3 bg-gray-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-gray-500 transition-colors flex items-center justify-center gap-2">
                                    <Check className="w-4 h-4" /> Finalizar / Entregado
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {orders.length === 0 && (
                    <div className="col-span-full py-20 text-center text-[var(--color-text-muted)]">
                        No hay pedidos recientes.
                    </div>
                )}
            </div>
        </div>
    )
}

export default OrdersManager
