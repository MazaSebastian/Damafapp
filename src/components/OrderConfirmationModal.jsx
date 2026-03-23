import { ShoppingBag, X, Banknote, Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'

const OrderConfirmationModal = ({ isOpen, onClose, onConfirm, orderData }) => {
    if (!isOpen) return null

    // Safe access to total
    const total = orderData?.total || 0

    // Dynamic Content based on Payment Method
    const getModalContent = () => {
        const method = orderData?.paymentMethod || 'Efectivo'

        switch (method) {
            case 'Mercado Pago':
                return {
                    title: 'Confirmar Pedido',
                    message: 'Estás a un paso de disfrutar tu comida. Serás redirigido a Mercado Pago para abonar.',
                    buttonText: 'Sí, Pagar',
                    color: '#009ee3', // MP Blue
                    icon: <ShoppingBag className="w-8 h-8 text-[#009ee3]" />
                }
            case 'Transferencia':
                return {
                    title: 'Confirmar Transferencia',
                    message: 'Al confirmar, verás los datos bancarios para realizar el pago. Tu pedido quedará pendiente hasta enviar el comprobante.',
                    buttonText: 'Entendido, ver datos',
                    color: '#9333ea', // Purple
                    icon: <Banknote className="w-8 h-8 text-purple-500" />
                }
            default: // Efectivo
                return {
                    title: 'Confirmar Pedido',
                    message: 'Tu pedido quedará registrado. Administración se pondrá en contacto para coordinar.',
                    buttonText: 'Confirmar Pedido',
                    color: '#16a34a', // Green
                    icon: <ShoppingBag className="w-8 h-8 text-green-500" />
                }
        }
    }

    const content = getModalContent()
    const [phoneInput, setPhoneInput] = useState(orderData?.customerPhone || '')
    // Default to empty if generic name to force user input
    const [nameInput, setNameInput] = useState(
        (orderData?.customerName === 'Cliente Web' || orderData?.customerName === 'Cliente' || orderData?.customerName === 'Invitado')
            ? ''
            : orderData?.customerName || ''
    )

    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleConfirm = () => {
        // Validation: Must have Name and Phone
        const finalPhone = orderData?.customerPhone || phoneInput.trim()
        const isGenericName = ['Cliente Web', 'Cliente', 'Invitado'].includes(orderData?.customerName)
        const finalName = (orderData?.customerName && !isGenericName) ? orderData.customerName : nameInput.trim()

        if (!finalPhone || !finalName) return

        setIsSubmitting(true)
        onConfirm({ phone: finalPhone, name: finalName })
    }

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

                    <div className="flex flex-col items-center text-center space-y-4 w-full">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: `${content.color}20` }}>
                            {content.icon}
                        </div>

                        <h3 className="text-xl font-bold text-white">{content.title}</h3>

                        <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">
                            {content.message}
                        </p>

                        {/* Contact Info Inputs if Missing (or Generic) */}
                        {(!orderData?.customerPhone || !orderData?.customerName || ['Cliente Web', 'Cliente', 'Invitado'].includes(orderData?.customerName)) && (
                            <div className="w-full text-left space-y-3 animate-in fade-in slide-in-from-top-2 bg-black/20 p-3 rounded-xl border border-white/5">
                                <p className="text-xs text-[var(--color-text-muted)] text-center mb-1">Por favor completa tus datos de contacto</p>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-white ml-1">Nombre y Apellido *</label>
                                    <input
                                        type="text"
                                        value={nameInput}
                                        onChange={(e) => setNameInput(e.target.value)}
                                        placeholder="Ej: Juan Perez"
                                        className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-all"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-white ml-1">Teléfono (WhatsApp) *</label>
                                    <input
                                        type="tel"
                                        value={phoneInput}
                                        onChange={(e) => setPhoneInput(e.target.value)}
                                        placeholder="Ej: 11 1234 5678"
                                        className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-all font-mono"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="py-2">
                            <span className="text-3xl font-bold text-white">${total.toFixed(2)}</span>
                            {orderData?.type === 'delivery' && (
                                <p className="text-xs text-[var(--color-text-muted)] mt-1">Incluye envío a domicilio</p>
                            )}
                        </div>

                        <div className="w-full space-y-3 pt-2">
                            <button
                                onClick={handleConfirm}
                                disabled={
                                    isSubmitting ||
                                    (!orderData?.customerPhone && !phoneInput.trim()) ||
                                    ((!orderData?.customerName || ['Cliente Web', 'Cliente', 'Invitado'].includes(orderData?.customerName)) && !nameInput.trim())
                                }
                                className="w-full text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                style={{ backgroundColor: content.color, boxShadow: `0 10px 15px -3px ${content.color}40` }}
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : content.buttonText}
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
