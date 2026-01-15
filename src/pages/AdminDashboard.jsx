import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, Package, ShoppingCart, Users, Settings, Newspaper, Gift, UtensilsCrossed, Ticket, Menu, X, Loader2, LogOut, DollarSign, ChefHat } from 'lucide-react'
import NewsManager from '../components/NewsManager'
import RewardsManager from '../components/RewardsManager'
import ProductManager from '../components/ProductManager'
import OrdersManager from '../components/OrdersManager'
import SettingsManager from '../components/SettingsManager'
import AdminOverview from '../components/AdminOverview'
import CouponsManager from '../components/CouponsManager'
import InventoryManager from '../components/InventoryManager'
import CustomersManager from '../components/CustomersManager'
import DebugConnection from '../components/DebugConnection'
import CashManager from '../components/CashManager'


const AdminDashboard = () => {
    const { user, role, loading, signOut } = useAuth()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('Overview')
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    useEffect(() => {
        if (!loading) {
            if (!user) {
                navigate('/login')
            } else if (role !== 'admin' && role !== 'owner') {
                console.warn('Unauthorized access attempt by:', user.email, 'Role:', role)
                if (role === 'user') {
                    navigate('/')
                }
            }
        }
    }, [user, role, loading, navigate])

    const handleLogout = async () => {
        await signOut()
        navigate('/login')
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
            <Loader2 className="w-10 h-10 animate-spin text-[var(--color-primary)]" />
        </div>
    )

    if (!user || (role !== 'admin' && role !== 'owner')) return null

    return (
        <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-main)] flex">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar (Desktop & Mobile) */}
            <aside className={`
                fixed md:static inset-y-0 left-0 z-50 w-64 bg-[var(--color-surface)] border-r border-white/5 flex flex-col transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-6 flex justify-between items-center">
                    <h2 className="text-xl font-bold tracking-tight">ADMIN<span className="text-[var(--color-secondary)]">PANEL</span></h2>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white/50 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                    <NavItem icon={<LayoutDashboard />} label="Vista General" active={activeTab === 'Overview'} onClick={() => { setActiveTab('Overview'); setIsSidebarOpen(false) }} />
                    <NavItem icon={<ShoppingCart />} label="Pedidos" active={activeTab === 'Orders'} onClick={() => { setActiveTab('Orders'); setIsSidebarOpen(false) }} />
                    <NavItem icon={<DollarSign />} label="Caja" active={activeTab === 'Cash'} onClick={() => { setActiveTab('Cash'); setIsSidebarOpen(false) }} />
                    <NavItem icon={<Newspaper />} label="Novedades" active={activeTab === 'Novedades'} onClick={() => { setActiveTab('Novedades'); setIsSidebarOpen(false) }} />
                    <NavItem icon={<Gift />} label="Canjes" active={activeTab === 'Canjes'} onClick={() => { setActiveTab('Canjes'); setIsSidebarOpen(false) }} />
                    <NavItem icon={<Ticket />} label="Cupones" active={activeTab === 'Cupones'} onClick={() => { setActiveTab('Cupones'); setIsSidebarOpen(false) }} />
                    <NavItem icon={<UtensilsCrossed />} label="Menú" active={activeTab === 'Menu'} onClick={() => { setActiveTab('Menu'); setIsSidebarOpen(false) }} />
                    <NavItem icon={<Package />} label="Inventario" active={activeTab === 'Inventory'} onClick={() => { setActiveTab('Inventory'); setIsSidebarOpen(false) }} />
                    <NavItem icon={<Users />} label="Clientes" active={activeTab === 'Customers'} onClick={() => { setActiveTab('Customers'); setIsSidebarOpen(false) }} />
                    <NavItem icon={<Settings />} label="Configuración" active={activeTab === 'Settings'} onClick={() => { setActiveTab('Settings'); setIsSidebarOpen(false) }} />
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
                    <button
                        onClick={handleLogout}
                        className="mt-3 w-full flex items-center justify-center gap-2 p-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-sm font-medium"
                    >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                    </button>
                </div>

                {/* Connection Status */}
                <DebugConnection />
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-8 overflow-y-auto h-screen">
                <header className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="md:hidden p-2 bg-[var(--color-surface)] rounded-lg text-white hover:bg-white/10 transition-colors"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h1 className="text-2xl font-bold">{activeTab}</h1>
                    </div>
                </header>

                {activeTab === 'Novedades' ? (
                    <NewsManager />
                ) : activeTab === 'Orders' ? (
                    <OrdersManager />
                ) : activeTab === 'Cash' ? (
                    <CashManager />
                ) : activeTab === 'Canjes' ? (
                    <RewardsManager />
                ) : activeTab === 'Cupones' ? (
                    <CouponsManager />
                ) : activeTab === 'Menu' ? (
                    <ProductManager />
                ) : activeTab === 'Inventory' ? (
                    <InventoryManager />
                ) : activeTab === 'Customers' ? (
                    <CustomersManager />
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
