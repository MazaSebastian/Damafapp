import { X, MapPin, Phone, Mail, Star, Calendar, ShoppingBag, DollarSign } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const CustomerDetailsModal = ({ isOpen, onClose, customer }) => {
    if (!isOpen || !customer) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[var(--color-surface)] w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-white/10 flex justify-between items-start bg-[var(--color-background)]">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                                {customer.first_name?.[0]?.toUpperCase() || customer.email?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    {customer.first_name ? `${customer.first_name} ${customer.last_name || ''}` : (customer.full_name || 'Sin nombre')}
                                    {customer.customer_id && (
                                        <span className="text-sm px-2 py-0.5 bg-white/10 rounded text-[var(--color-text-muted)] font-mono">
                                            #{customer.customer_id}
                                        </span>
                                    )}
                                </h2>
                                <p className="text-[var(--color-text-muted)] text-sm">Registrado: {new Date(customer.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-6 h-6 text-gray-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto space-y-8">

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-[var(--color-background)] p-4 rounded-xl border border-white/5 text-center">
                                <ShoppingBag className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                                <div className="text-2xl font-bold text-white">{customer.orderCount}</div>
                                <div className="text-xs text-[var(--color-text-muted)] uppercase">Pedidos</div>
                            </div>
                            <div className="bg-[var(--color-background)] p-4 rounded-xl border border-white/5 text-center">
                                <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-400" />
                                <div className="text-2xl font-bold text-white">${customer.totalSpent?.toLocaleString()}</div>
                                <div className="text-xs text-[var(--color-text-muted)] uppercase">Gastado</div>
                            </div>
                            <div className="bg-[var(--color-background)] p-4 rounded-xl border border-white/5 text-center">
                                <Star className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                                <div className="text-2xl font-bold text-white">{customer.stars || 0}</div>
                                <div className="text-xs text-[var(--color-text-muted)] uppercase">Puntos</div>
                            </div>
                        </div>

                        {/* Contact & Address */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Contact Info */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2">Contacto</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <Mail className="w-5 h-5 text-[var(--color-text-muted)]" />
                                        <span>{customer.email || 'No registrado'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <Phone className="w-5 h-5 text-[var(--color-text-muted)]" />
                                        <span>{customer.phone || 'No registrado'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Address Info */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2">Dirección</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 text-gray-300">
                                        <MapPin className="w-5 h-5 text-[var(--color-text-muted)] mt-1" />
                                        <div>
                                            <p className="font-medium text-white">{customer.address || 'Sin dirección principal'}</p>
                                            {(customer.floor || customer.department) && (
                                                <p className="text-sm text-[var(--color-text-muted)]">
                                                    Piso: {customer.floor || '-'} • Depto: {customer.department || '-'}
                                                </p>
                                            )}
                                            {customer.postal_code && (
                                                <p className="text-sm text-[var(--color-text-muted)]">
                                                    CP: {customer.postal_code}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Additional Info / Metadatos */}
                        {/* Could add notes or last order date here later */}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}

export default CustomerDetailsModal
