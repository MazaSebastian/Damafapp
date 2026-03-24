import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTenant } from '../context/TenantContext'
import { requestForToken } from '../services/messaging'
import { toast } from 'sonner'

const NotificationModal = () => {
    const { user } = useAuth()
    const { tenantId } = useTenant()
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        const checkPermission = () => {
            // 1. Must be logged in
            if (!user) return

            // 2. Browser must support notifications
            if (!('Notification' in window)) return

            // 3. Permission must be default (not granted/denied)
            if (Notification.permission !== 'default') return

            // 4. Cooldown check (24h)
            const lastPrompt = localStorage.getItem('last_notif_prompt')
            const now = Date.now()
            if (lastPrompt && (now - parseInt(lastPrompt) < 24 * 60 * 60 * 1000)) {
                return
            }

            // Show Modal
            // Small delay to not overwhelm on initial load
            setTimeout(() => setIsOpen(true), 2000)
        }

        checkPermission()
    }, [user])

    const handleEnable = async () => {
        setIsOpen(false)
        toast.info('Solicitando permiso...')

        try {
            const { token, error } = await requestForToken(user.id, tenantId)
            if (token) {
                toast('🎉 ¡Súper! Te avisaremos 🛵', {
                    description: 'Te notificaremos apenas tu pedido salga de la cocina.',
                    duration: 5000,
                    style: {
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', // Emerald Gradient
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        padding: '16px',
                        boxShadow: '0 10px 30px -10px rgba(16, 185, 129, 0.5)'
                    }
                })
            } else if (error === 'permission_denied') {
                toast.error('Permiso denegado desde el navegador.')
            }
        } catch (e) {
            console.error(e)
        }
    }

    const handleDismiss = () => {
        setIsOpen(false)
        localStorage.setItem('last_notif_prompt', Date.now().toString())
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={handleDismiss}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative bg-[var(--color-surface)] border border-white/10 w-full max-w-md p-6 rounded-3xl shadow-2xl overflow-hidden"
                    >
                        {/* Decorative Gradient Blob */}
                        <div className="absolute -top-20 -right-20 w-60 h-60 bg-[var(--color-primary)]/20 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative text-center flex flex-col items-center">
                            <div className="w-20 h-20 bg-[var(--color-primary)]/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <Bell className="w-10 h-10 text-[var(--color-primary)] fill-current" />
                            </div>

                            <h2 className="text-2xl font-black text-white mb-2 leading-tight">
                                ¿Quieres saber cuándo<br />llega tu comida?
                            </h2>

                            <p className="text-[var(--color-text-muted)] mb-8 max-w-xs">
                                Activa las notificaciones para recibir actualizaciones en tiempo real sobre el estado de tu pedido.
                            </p>

                            <div className="flex flex-col gap-3 w-full">
                                <button
                                    onClick={handleEnable}
                                    className="w-full bg-[var(--color-primary)] text-white font-black text-lg py-4 rounded-xl shadow-lg shadow-[var(--color-primary)]/25 hover:brightness-110 active:scale-95 transition-all"
                                >
                                    ACTIVAR AHORA
                                </button>
                                <button
                                    onClick={handleDismiss}
                                    className="w-full bg-transparent text-[var(--color-text-muted)] font-bold text-sm py-3 rounded-xl hover:text-white transition-colors"
                                >
                                    Ahora no, gracias
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

export default NotificationModal
