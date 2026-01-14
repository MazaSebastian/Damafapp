import { ShoppingBag, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

const OrderConfirmationModal = ({ isOpen, onClose, onConfirm, total }) => {
    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-[var(--color-surface)] w-full max-w-sm rounded-2xl border border-white/10 p-6 relative z-10 shadow-2xl"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/40 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-[#009ee3]/20 rounded-full flex items-center justify-center mb-2">
                            <ShoppingBag className="w-8 h-8 text-[#009ee3]" />
                        </div>

                        <h3 className="text-xl font-bold text-white">Confirmar Pedido</h3>

                        <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">
                            Estás a un paso de disfrutar tu comida. Serás redirigido a Mercado Pago para abonar.
                        </p>

                        <div className="py-2">
                            <span className="text-3xl font-bold text-white">${total.toFixed(2)}</span>
                        </div>

                        <div className="w-full space-y-3 pt-2">
                            <button
                                onClick={onConfirm}
                                className="w-full bg-[#009ee3] hover:bg-[#009ee3]/90 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
                            >
                                Sí, Pagar
                            </button>

                            <button
                                onClick={onClose}
                                className="w-full py-3.5 rounded-xl font-bold text-[var(--color-text-muted)] hover:bg-white/5 active:scale-95 transition-all border border-white/5"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}

export default OrderConfirmationModal
