import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion' // Assumed available as other modals use animation classes
import { Clock, ChefHat, XCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../../supabaseClient'

const OrderApprovalModal = ({ isOpen, orderId, onClose, onApproved, onRejected }) => {
    const [ordersAhead, setOrdersAhead] = useState(0)
    const [status, setStatus] = useState('waiting') // waiting, approved, rejected

    useEffect(() => {
        if (isOpen && orderId) {
            fetchQueuePosition()
            subscribeToOrder()
        }
    }, [isOpen, orderId])

    const fetchQueuePosition = async () => {
        // Count active orders (pending, cooking) created before this one
        // Ideally we check created_at, but we might not have it client side immediately active.
        // We'll query count of orders with status in (pending, cooking, pending_approval)
        const { count, error } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .in('status', ['pending', 'cooking', 'pending_approval'])
            .neq('id', orderId) // Exclude self if already inserted

        if (!error) {
            setOrdersAhead(count || 0)
        }
    }

    const subscribeToOrder = () => {
        const channel = supabase
            .channel(`order_approval_${orderId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'orders',
                filter: `id=eq.${orderId}`
            }, (payload) => {
                const newStatus = payload.new.status
                if (newStatus === 'pending_payment') {
                    setStatus('approved')
                    setTimeout(() => onApproved(), 1500)
                } else if (newStatus === 'rejected' || newStatus === 'cancelled') {
                    setStatus('rejected')
                    setTimeout(() => onRejected(), 2000)
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md p-6 border border-white/10 shadow-2xl relative overflow-hidden">

                {/* Background Glow */}
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent ${status === 'waiting' ? 'animate-pulse' : ''}`} />

                <div className="text-center space-y-6 py-6">

                    {/* Status Icon */}
                    <div className="flex justify-center">
                        {status === 'waiting' && <Clock className="w-16 h-16 text-yellow-500 animate-pulse" />}
                        {status === 'approved' && <CheckCircle className="w-16 h-16 text-green-500" />}
                        {status === 'rejected' && <XCircle className="w-16 h-16 text-red-500" />}
                    </div>

                    {/* Status Text */}
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-white">
                            {status === 'waiting' && 'Esperando confirmación...'}
                            {status === 'approved' && '¡Pedido Aceptado!'}
                            {status === 'rejected' && 'Pedido Rechazado'}
                        </h2>
                        <p className="text-white/60">
                            {status === 'waiting' && 'El local está revisando tu pedido.'}
                            {status === 'approved' && 'Te redirigiremos al pago en unos segundos.'}
                            {status === 'rejected' && 'Lo sentimos, el local no puede tomar tu pedido.'}
                        </p>
                    </div>

                    {/* Queue Info */}
                    {status === 'waiting' && (
                        <div className="bg-white/5 rounded-xl p-4 flex items-center justify-center gap-3 border border-white/5">
                            <ChefHat className="text-[var(--color-secondary)] w-6 h-6" />
                            <div className="text-left">
                                <span className="block text-white font-bold text-lg">{ordersAhead} Pedidos</span>
                                <span className="text-xs text-white/50">adelante del tuyo</span>
                            </div>
                        </div>
                    )}

                    {/* Cancel Button (Only waiting) */}
                    {status === 'waiting' && (
                        <button
                            onClick={onClose}
                            className="text-white/40 hover:text-white/80 text-sm transition-colors"
                        >
                            Cancelar espera
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default OrderApprovalModal
