import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, Package, ShoppingCart, Users, Settings, Newspaper, Gift, UtensilsCrossed, Ticket } from 'lucide-react'
import NewsManager from '../components/NewsManager'
import RewardsManager from '../components/RewardsManager'
import ProductManager from '../components/ProductManager'
import OrdersManager from '../components/OrdersManager'
import SettingsManager from '../components/SettingsManager'
import AdminOverview from '../components/AdminOverview'



const AdminDashboard = () => {
    const { user, role, loading } = useAuth()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('Overview')

    useEffect(() => {
        if (!loading) {
            if (!user) {
                navigate('/login')
            } else if (role !== 'admin' && role !== 'owner') { // 'owner' for safety if using that
                // Assuming 'admin' is the role key
                // We can just redirect to home and show alert if not admin
                console.warn('Unauthorized access attempt by:', user.email, 'Role:', role)
                // For verify step: let's alert only if we are sure.
                if (role === 'user') {
                    navigate('/')
                    // alert('Access Restricted: Admins Only') -> react strict mode might double alert
                }
            }
        }
    }, [user, role, loading, navigate])

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] text-[var(--color-text-main)]">Loading...</div>

    // Ideally, return null while redirecting, but the useEffect handles it.
    if (!user || (role !== 'admin' && role !== 'owner')) return null

    return (
        <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-main)] flex">
            {/* Sidebar */}
            <aside className="w-64 bg-[var(--color-surface)] border-r border-white/5 hidden md:flex flex-col">
                <div className="p-6">
                    <h2 className="text-xl font-bold tracking-tight">ADMIN<span className="text-[var(--color-secondary)]">PANEL</span></h2>
                </div>
                <nav className="flex-1 px-4 space-y-2">
                    <NavItem icon={<LayoutDashboard />} label="Overview" active={activeTab === 'Overview'} onClick={() => setActiveTab('Overview')} />
                    <NavItem icon={<ShoppingCart />} label="Orders" active={activeTab === 'Orders'} onClick={() => setActiveTab('Orders')} />
                    <NavItem icon={<Newspaper />} label="Novedades" active={activeTab === 'Novedades'} onClick={() => setActiveTab('Novedades')} />
                    <NavItem icon={<Gift />} label="Canjes" active={activeTab === 'Canjes'} onClick={() => setActiveTab('Canjes')} />
                    <NavItem icon={<Ticket />} label="Cupones" active={activeTab === 'Cupones'} onClick={() => setActiveTab('Cupones')} />
                    <NavItem icon={<UtensilsCrossed />} label="Menú" active={activeTab === 'Menu'} onClick={() => setActiveTab('Menu')} />
                    <NavItem icon={<Package />} label="Inventory" active={activeTab === 'Inventory'} onClick={() => setActiveTab('Inventory')} />
                    <NavItem icon={<Users />} label="Customers" active={activeTab === 'Customers'} onClick={() => setActiveTab('Customers')} />
                    <NavItem icon={<Settings />} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
                </nav>
                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-xs font-bold">
                            {user.email[0].toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate">{user.email}</p>
                            <p className="text-xs text-[var(--color-text-muted)] capitalize">{role}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold">{activeTab}</h1>
                    <div className="md:hidden block">
                        {/* Mobile Menu Trigger Placeholder */}
                        <button className="bg-[var(--color-surface)] p-2 rounded-lg">Menu</button>
                    </div>
                </header>

                {activeTab === 'Novedades' ? (
                    <NewsManager />
                ) : activeTab === 'Orders' ? (
                    <OrdersManager />
                ) : activeTab === 'Canjes' ? (
                    <RewardsManager />
                ) : activeTab === 'Cupones' ? (
                    <CouponsManager />
                ) : activeTab === 'Menu' ? (
                    <ProductManager />
                ) : activeTab === 'Settings' ? (
                    <SettingsManager />
                ) : (
                    <AdminOverview />
                )}
            </main>
        </div>
    )
}

// Helper Components
const NavItem = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-purple-900/20' : 'text-[var(--color-text-muted)] hover:bg-white/5 hover:text-white'}`}>
        {icon && <span className="w-5 h-5">{icon}</span>}
        <span className="font-medium">{label}</span>
    </button>
)

const StatCard = ({ title, value, trend, color }) => (
    <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-white/5">
        <h4 className="text-[var(--color-text-muted)] text-sm mb-2">{title}</h4>
        <div className="flex items-end justify-between">
            <span className="text-3xl font-bold">{value}</span>
            {trend && <span className={`text-xs font-bold ${color || 'text-green-400'}`}>{trend}</span>}
        </div>
    </div>
)

export default AdminDashboard
