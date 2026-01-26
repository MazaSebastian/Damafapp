import { motion, AnimatePresence } from 'framer-motion'
import { Bell, ChefHat, X, CheckCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

const NewOrderAlert = ({ order, isOpen, onClose, onView }) => {

    // Safety check for Order Number vs UUID
    const displayId = order
        ? (order.order_number ? `#${order.order_number.toString().padStart(4, '0')}` : `#${order.id.slice(0, 4)}`)
        : '...'

    return (
        <AnimatePresence>
            {isOpen && order && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: 100 }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            transition: { type: 'spring', damping: 15 }
                        }}
                        exit={{ opacity: 0, scale: 0.5, y: 100 }}
                        className="relative w-full max-w-lg bg-[var(--color-surface)] border-2 border-[var(--color-secondary)] rounded-3xl shadow-[0_0_50px_rgba(249,115,22,0.5)] overflow-hidden"
                    >
                        {/* Header bg */}
                        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[var(--color-secondary)]/20 to-transparent pointer-events-none" />

                        <div className="relative p-8 flex flex-col items-center text-center">

                            {/* Icon Pulse */}
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-[var(--color-secondary)] rounded-full blur-2xl opacity-50 animate-pulse" />
                                <div className="relative w-24 h-24 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-xl border-4 border-[var(--color-surface)]">
                                    <Bell className="w-12 h-12 text-white animate-bounce" />
                                </div>
                            </div>

                            <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-wide">
                                ¡Nuevo Pedido!
                            </h2>

                            <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 mb-6">
                                <span className="text-[var(--color-text-muted)] text-sm uppercase font-bold tracking-wider">Orden</span>
                                <div className="text-4xl font-mono font-bold text-[var(--color-secondary)]">
                                    {displayId}
                                </div>
                            </div>

                            {order.total && (
                                <p className="text-xl text-white font-bold mb-8">
                                    Total: <span className="text-green-400">${order.total}</span>
                                </p>
                            )}

                            <div className="flex gap-4 w-full">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-4 rounded-xl font-bold text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    Cerrar
                                </button>
                                <button
                                    onClick={() => {
                                        onView()
                                        onClose()
                                    }}
                                    className="flex-[2] bg-[var(--color-secondary)] hover:bg-orange-600 text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-orange-900/40 transform hover:scale-105 transition-all flex items-center justify-center gap-2"
                                >
                                    <ChefHat className="w-6 h-6" />
                                    VER PEDIDO
                                </button>
                            </div>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

export default NewOrderAlert
