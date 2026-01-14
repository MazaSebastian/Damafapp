import { useNavigate } from 'react-router-dom'
import { UserPlus, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

const GuestAlertModal = ({ isOpen, onClose, onContinueAsGuest }) => {
    const navigate = useNavigate()

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
                        <div className="w-16 h-16 bg-[var(--color-primary)]/20 rounded-full flex items-center justify-center mb-2">
                            <UserPlus className="w-8 h-8 text-[var(--color-primary)]" />
                        </div>

                        <h3 className="text-xl font-bold text-white">Psst Psst! Hey! 👋</h3>
                        <p className="text-[var(--color-primary)] font-bold text-sm -mt-2">¡Para ver más tenés que registrarte!</p>

                        <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">
                            Registrate ahora para acceder a descuentos exclusivos, acumular puntos y seguir tus pedidos en tiempo real.
                        </p>

                        <div className="w-full space-y-3 pt-2">
                            <button
                                onClick={() => navigate('/register')}
                                className="w-full bg-[var(--color-primary)] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-900/20 active:scale-95 transition-all"
                            >
                                Sí, Registrarme
                            </button>

                            <button
                                onClick={onContinueAsGuest}
                                className="w-full py-3.5 rounded-xl font-bold text-[var(--color-text-muted)] hover:bg-white/5 active:scale-95 transition-all border border-white/5"
                            >
                                Continuar como invitado
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}

export default GuestAlertModal
