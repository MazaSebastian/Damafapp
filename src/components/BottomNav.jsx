import { Home, UtensilsCrossed, User, Ticket, ShoppingBag } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import GuestAlertModal from './GuestAlertModal'

const BottomNav = () => {
    const location = useLocation()
    const currentPath = location.pathname
    const navigate = useNavigate()
    const { user } = useAuth()
    const [showGuestAlert, setShowGuestAlert] = useState(false)

    const handleMenuClick = () => {
        if (user) {
            navigate('/menu')
            return
        }
        setShowGuestAlert(true)
    }

    return (
        <>
            <nav className="fixed bottom-0 w-full bg-[var(--color-surface)] border-t border-white/5 pb-2 pt-2 z-50 h-[80px]">
                <div className="max-w-md mx-auto h-full grid grid-cols-5 relative">
                    {/* 1. Pedidos */}
                    <Link to="/my-orders" className="flex flex-col items-center justify-end pb-3">
                        <NavItem
                            icon={<ShoppingBag className="w-5 h-5" />}
                            label="Pedidos"
                            active={currentPath === '/my-orders'}
                        />
                    </Link>

                    {/* 2. Pide Aquí */}
                    <button onClick={handleMenuClick} className="flex flex-col items-center justify-end pb-3">
                        <NavItem
                            icon={<UtensilsCrossed className="w-5 h-5" />}
                            label="Pide aquí"
                            active={currentPath === '/menu'}
                        />
                    </button>

                    {/* 3. HOME (Center Floating) */}
                    <div className="flex items-end justify-center pb-8 relative">
                        <Link to="/" className="absolute -top-6">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl shadow-orange-500/30 transition-all transform hover:scale-105 border-[6px] border-[var(--color-background)] ${currentPath === '/' ? 'bg-[var(--color-secondary)] text-white' : 'bg-[#2a2a2a] text-gray-400 border-white/5'}`}>
                                <Home className="w-8 h-8" />
                            </div>
                        </Link>
                    </div>

                    {/* 4. Cupones */}
                    <Link to="/coupons" className="flex flex-col items-center justify-end pb-3">
                        <NavItem
                            icon={<Ticket className="w-5 h-5" />}
                            label="Cupones"
                            active={currentPath === '/coupons'}
                        />
                    </Link>

                    {/* 5. Cuenta */}
                    <Link to="/profile" className="flex flex-col items-center justify-end pb-3">
                        <NavItem
                            icon={<User className="w-5 h-5" />}
                            label="Cuenta"
                            active={currentPath === '/profile'}
                        />
                    </Link>
                </div>
            </nav>

            <GuestAlertModal
                isOpen={showGuestAlert}
                onClose={() => setShowGuestAlert(false)}
                onContinueAsGuest={() => {
                    setShowGuestAlert(false)
                    navigate('/menu')
                }}
            />
        </>
    )
}

const NavItem = ({ icon, label, active }) => (
    <div className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-[var(--color-secondary)]' : 'text-[var(--color-text-muted)] hover:text-white'}`}>
        {icon}
        <span className="text-[10px] font-bold tracking-wide uppercase">{label}</span>
    </div>
)

export default BottomNav
