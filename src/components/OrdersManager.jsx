import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Loader2, Check, Clock, X, ChefHat, Bell, Trash2, Banknote, CreditCard, Printer } from 'lucide-react'
import { toast } from 'sonner'
import TicketTemplate from './print/TicketTemplate'

const OrdersManager = () => {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)

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
        fetchOrders()

        // Subscription for real-time updates
        const channel = supabase
            .channel('orders_channel')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders'
            }, (payload) => {
                // Play sound only on INSERT (new order)
                if (payload.eventType === 'INSERT') {
                    playNewOrderSound()
                    toast.success('🔔 Nuevo pedido recibido!', {
                        description: `Pedido #${payload.new.id.slice(0, 8)}`
                    })
                }
                fetchOrders()
            })
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
        // Fetch current order details needed for cash logging before update
        // (Or we could assume we have them in state, but let's be safe if we want the payment_method which might be missing in state if not fetched)
        // Actually, we need to update fetchOrder to include payment_method first. 
        // But let's assume valid order object in 'orders' state.

        const order = orders.find(o => o.id === orderId)

        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId)

        if (!error) {
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
            toast.success(`Pedido actualizado a: ${newStatus}`)

            // Log Cash Sale if Completed
            if (newStatus === 'completed' || newStatus === 'paid') {
                // Dynamic import or passed as prop would be cleaner, but we'll import at top
                const { logCashSale } = await import('../utils/cashUtils')
                const result = await logCashSale(orderId, order.total, order.payment_method, supabase)
                if (result.message && newStatus === 'completed' && order.payment_method === 'cash') {
                    // Show toast specific to cash result
                    if (result.success) toast.success(result.message)
                    else toast.warning(result.message)
                }
            }

        } else {
            console.error('Error updating status:', error)
            toast.error('Error al actualizar estado')
        }
    }

    const deleteOrder = (orderId) => {
        toast.warning('¿Eliminar pedido permanentemente?', {
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
        toast.warning('¿Limpiar historial completo?', {
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

    const clearAllOrders = () => {
        toast.error('¿BORRAR ABSOLUTAMENTE TODO?', {
            description: '¡Cuidado! Esto eliminará TODOS los pedidos, incluidos los que están EN CURSO (Pendientes, Cocinando...).',
            action: {
                label: 'SÍ, BORRAR TODO',
                onClick: async () => {
                    setLoading(true)
                    // Delete all by matching any total greater than -1 (effectively all)
                    const { error } = await supabase
                        .from('orders')
                        .delete()
                        .gt('total', -1)

                    if (!error) {
                        await fetchOrders()
                        toast.success('Se eliminaron TODOS los pedidos')
                    } else {
                        console.error('Error deleting all:', error)
                        toast.error('Error al vaciar la base de datos')
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
            case 'packaging': return 'bg-red-500/20 text-red-500 font-black animate-bounce' // Updated for emphasis
            case 'sent': return 'bg-purple-500/20 text-purple-500'
            case 'completed': return 'bg-gray-500/20 text-gray-400'
            case 'cancelled':
            case 'rejected': return 'bg-red-500/20 text-red-500'
            default: return 'bg-gray-500/20 text-gray-400'
        }
    }

    const [printingOrder, setPrintingOrder] = useState(null)

    const handlePrint = (order) => {
        setPrintingOrder(order)
        // Give React a moment to render the ticket with new data
        setTimeout(() => {
            window.print()
        }, 100)
    }

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[var(--color-secondary)]" /></div>

    return (
        <div className="space-y-6">
            {/* Hidden Ticket Template for Printing */}
            <div className="hidden">
                <TicketTemplate order={printingOrder} />
            </div>

            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <ChefHat className="text-[var(--color-secondary)]" />
                    Gestión de Pedidos
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={clearAllOrders}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                    >
                        <Trash2 className="w-4 h-4" />
                        Borrar TODO
                    </button>
                    <button
                        onClick={clearHistory}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Limpiar Completados
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {orders.map(order => (
                    <div key={order.id} className={`bg-[var(--color-surface)] rounded-2xl border overflow-hidden flex flex-col transition-all duration-300 ${order.status === 'packaging'
                        ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse'
                        : 'border-white/5'
                        }`}>
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
                            <div>
                                <div className="flex items-center gap-1 mt-1 text-xs font-medium text-[var(--color-primary)]">
                                    {order.payment_method === 'cash' && <><Banknote className="w-3 h-3" /> Efectivo</>}
                                    {order.payment_method === 'transfer' && <><Banknote className="w-3 h-3" /> Transferencia</>}
                                    {order.payment_method === 'mercadopago' && <><CreditCard className="w-3 h-3" /> MercadoPago</>}
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                <span className="font-bold text-lg block">${order.total}</span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handlePrint(order)}
                                        className="text-[var(--color-text-muted)] hover:text-white p-1 rounded hover:bg-white/10"
                                        title="Imprimir Ticket"
                                    >
                                        <Printer className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => deleteOrder(order.id)}
                                        className="text-[var(--color-text-muted)] hover:text-red-400 p-1 rounded hover:bg-white/10"
                                        title="Eliminar pedido"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
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
                                            <div key={i}>+ {m.name} {m.quantity > 1 ? <span className="text-white font-bold">x{m.quantity}</span> : ''}</div>
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
                                <div className="col-span-3 grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => {
                                            toast('¿Rechazar pedido?', {
                                                action: {
                                                    label: 'Sí, Rechazar',
                                                    onClick: () => updateStatus(order.id, 'rejected')
                                                },
                                            })
                                        }}
                                        className="bg-red-500/10 text-red-500 py-2 rounded-lg font-bold text-sm hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <X className="w-4 h-4" /> Rechazar
                                    </button>

                                    {!order.is_paid && order.payment_method !== 'cash' ? (
                                        <button
                                            onClick={async () => {
                                                const { error } = await supabase.from('orders').update({ is_paid: true }).eq('id', order.id)
                                                if (!error) {
                                                    setOrders(orders.map(o => o.id === order.id ? { ...o, is_paid: true } : o))
                                                    toast.success('Pago confirmado')
                                                } else {
                                                    toast.error('Error al confirmar pago')
                                                }
                                            }}
                                            className="bg-green-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-green-500 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Banknote className="w-4 h-4" /> Confirmar Pago
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                handlePrint(order)
                                                updateStatus(order.id, 'cooking')
                                            }}
                                            className="bg-green-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-green-500 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Check className="w-4 h-4" /> Aceptar Pedido
                                        </button>
                                    )}
                                </div>
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
