import { motion, AnimatePresence } from 'framer-motion'
import { X, User, CreditCard, ShoppingBag, MapPin, Info, LogOut, ChevronRight, Globe } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRef, useEffect } from 'react'

const Sidebar = ({ isOpen, onClose }) => {
    const { user, signOut } = useAuth()
    const navigate = useNavigate()
    const sidebarRef = useRef(null)

    // Handle outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                onClose()
            }
        }
        if (isOpen) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen, onClose])

    const handleSignOut = async () => {
        await signOut()
        onClose()
        navigate('/')
    }

    const menuItems = [
        { icon: User, label: 'Información de cuenta', action: () => { } }, // Placeholder for Profile Edit
        { icon: CreditCard, label: 'Métodos de pago', action: () => { } }, // Placeholder
        { icon: ShoppingBag, label: 'Órdenes recientes', to: '/my-orders' },
        { icon: Globe, label: 'Preferencia de comunicación', action: () => { } },
        { icon: MapPin, label: 'Encontrar un restaurante', action: () => { } },
        { icon: Info, label: 'Sobre la aplicación', to: '/club-info' },
    ]

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Drawer */}
                    <motion.div
                        ref={sidebarRef}
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 left-0 w-[80%] max-w-sm h-full bg-[var(--color-surface)] z-50 shadow-2xl overflow-y-auto flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 bg-[var(--color-background)]">
                            <div className="flex justify-between items-center mb-6">
                                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                                    <img src="/logo-damaf.png" alt="Logo" className="w-6 h-auto" />
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                    <X className="w-6 h-6 text-white" />
                                </button>
                            </div>

                            {user ? (
                                <div>
                                    <h3 className="font-bold text-lg text-white">Hola, {user.email?.split('@')[0]}!</h3>
                                    <p className="text-xs text-[var(--color-text-muted)]">{user.email}</p>
                                </div>
                            ) : (
                                <div>
                                    <h3 className="font-bold text-lg text-white">¡Bienvenido!</h3>
                                    <Link
                                        to="/login"
                                        onClick={onClose}
                                        className="text-xs text-[var(--color-secondary)] font-bold hover:underline"
                                    >
                                        Inicia sesión para más beneficios
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Menu Items */}
                        <div className="flex-1 py-4">
                            {menuItems.map((item, index) => {
                                const Icon = item.icon
                                const Content = (
                                    <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors cursor-pointer group">
                                        <div className="flex items-center gap-4">
                                            <Icon className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-[var(--color-secondary)] transition-colors" />
                                            <span className="text-sm font-medium text-white">{item.label}</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-white/20" />
                                    </div>
                                )

                                return item.to ? (
                                    <Link key={index} to={item.to} onClick={onClose}>{Content}</Link>
                                ) : (
                                    <div key={index} onClick={() => { item.action?.(); onClose() }}>{Content}</div>
                                )
                            })}
                        </div>

                        {/* Footer / Logout */}
                        {user && (
                            <div className="p-4 border-t border-white/5">
                                <button
                                    onClick={handleSignOut}
                                    className="flex items-center gap-4 p-4 w-full text-left text-red-400 hover:bg-red-500/10 rounded-xl transition-colors font-bold text-sm"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Cerrar Sesión
                                </button>
                            </div>
                        )}

                        <div className="p-6 text-center">
                            <p className="text-[10px] text-[var(--color-text-muted)]">Versión 2.1.0 • DamafAPP</p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default Sidebar
