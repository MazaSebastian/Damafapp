import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, Package, ShoppingCart, Users, Settings, Newspaper, Gift, UtensilsCrossed, Ticket } from 'lucide-react'
import NewsManager from '../components/NewsManager'
import RewardsManager from '../components/RewardsManager'
import ProductManager from '../components/ProductManager'
import OrdersManager from '../components/OrdersManager'
import SettingsManager from '../components/SettingsManager'



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
                ) : (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <StatCard title="Total Revenue" value="$12,345" trend="+12%" />
                            <StatCard title="Active Orders" value="23" trend="Pending" color="text-orange-400" />
                            <StatCard title="Total Products" value="45" />
                            <StatCard title="Registered Users" value="1,234" trend="+5%" />
                        </div>

                        {/* Recent Orders Placeholder */}
                        <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-white/5">
                            <h3 className="text-lg font-bold mb-4">Recent Orders</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-[var(--color-text-muted)]">
                                    <thead className="bg-[var(--color-background)]/50 text-[var(--color-text-main)] uppercase text-xs">
                                        <tr>
                                            <th className="p-3 rounded-l-lg">Order ID</th>
                                            <th className="p-3">Customer</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3">Total</th>
                                            <th className="p-3 rounded-r-lg">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-white/5">
                                            <td className="p-3">#ORD-001</td>
                                            <td className="p-3 font-medium text-[var(--color-text-main)]">Juan Perez</td>
                                            <td className="p-3"><span className="bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded text-xs">Cooking</span></td>
                                            <td className="p-3">$25.00</td>
                                            <td className="p-3">Today, 10:30 AM</td>
                                        </tr>
                                        <tr className="border-b border-white/5">
                                            <td className="p-3">#ORD-002</td>
                                            <td className="p-3 font-medium text-[var(--color-text-main)]">Maria Rodriguez</td>
                                            <td className="p-3"><span className="bg-green-500/20 text-green-500 px-2 py-0.5 rounded text-xs">Ready</span></td>
                                            <td className="p-3">$18.50</td>
                                            <td className="p-3">Today, 10:15 AM</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
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
