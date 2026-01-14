import { Home, UtensilsCrossed, User, Ticket, ShoppingBag } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import GuestAlertModal from './GuestAlertModal'

const BottomNav = () => {
    const location = useLocation()
    const currentPath = location.pathname
    const navigate = useNavigate()
    const { user } = useAuth()
    const [showGuestAlert, setShowGuestAlert] = useState(false)
    const [activeOrdersCount, setActiveOrdersCount] = useState(0)

    useEffect(() => {
        if (!user) {
            // Check Guest Orders
            const guestOrders = JSON.parse(localStorage.getItem('damaf_guest_orders') || '[]')
            const active = guestOrders.filter(o => ['pending', 'cooking', 'packaging', 'sent'].includes(o.status)).length
            setActiveOrdersCount(active)
            return
        }

        const fetchActiveOrders = async () => {
            const { count } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .in('status', ['pending', 'cooking', 'packaging', 'sent'])

            setActiveOrdersCount(count || 0)
        }

        fetchActiveOrders()

        // Subscribe to changes
        const channel = supabase
            .channel('bottom_nav_orders')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `user_id=eq.${user.id}`
            }, () => {
                fetchActiveOrders()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user])

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
                    {/* 1. Menú (Antes Pide Aquí) */}
                    <Link to="/menu" className="flex flex-col items-center justify-end pb-3">
                        <NavItem
                            icon={<UtensilsCrossed className="w-5 h-5" />}
                            label="Menú"
                            active={currentPath === '/menu'}
                        />
                    </Link>

                    {/* 2. Pedidos */}
                    <Link to="/my-orders" className="flex flex-col items-center justify-end pb-3 relative">
                        <NavItem
                            icon={<ShoppingBag className="w-5 h-5" />}
                            label="Pedidos"
                            active={currentPath === '/my-orders'}
                        />
                        {activeOrdersCount > 0 && (
                            <span className="absolute top-0 right-4 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse shadow-lg ring-2 ring-[var(--color-surface)]">
                                {activeOrdersCount}
                            </span>
                        )}
                    </Link>

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
