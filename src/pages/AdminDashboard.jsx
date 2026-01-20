import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, Package, ShoppingCart, Users, Settings, Newspaper, Gift, UtensilsCrossed, Ticket, Menu, X, Loader2, LogOut, DollarSign, ChefHat, Layers, TrendingUp, Clock, Monitor } from 'lucide-react'
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
import ModifiersManager from '../components/ModifiersManager'
import AnalyticsManager from '../components/AnalyticsManager'
import SlotManager from '../components/admin/SlotManager'
import IngredientManager from '../components/admin/IngredientManager'
import DriversManager from '../components/DriversManager'
import { supabase } from '../supabaseClient'
import { toast } from 'sonner'

const AdminDashboard = () => {
    const { user, role, loading, signOut } = useAuth()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('Overview')
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    // Global Sound Notification
    const playNewOrderSound = () => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const playBell = (startTime) => {
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()
            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)
            oscillator.frequency.setValueAtTime(800, startTime)
            oscillator.frequency.exponentialRampToValueAtTime(600, startTime + 0.1)
            gainNode.gain.setValueAtTime(0.6, startTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3)
            oscillator.start(startTime)
            oscillator.stop(startTime + 0.3)
        }
        playBell(audioContext.currentTime) // 1
        playBell(audioContext.currentTime + 0.4) // 2
        playBell(audioContext.currentTime + 0.8) // 3
    }

    // Global Real-time Subscription
    useEffect(() => {
        if (!user) return

        const channel = supabase
            .channel('global_admin_alerts')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'orders'
            }, (payload) => {
                // Determine if we should alert (e.g. ignore if simple status update? logic says event=INSERT so only new)
                playNewOrderSound()
                toast.success('🔔 ¡NUEVO PEDIDO RECIBIDO!', {
                    description: `Orden #${payload.new.id.slice(0, 8)}`,
                    duration: 8000,
                    action: {
                        label: 'Ver Pedidos',
                        onClick: () => setActiveTab('Orders')
                    }
                })
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user])


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
                <div className="p-6 flex justify-center items-center border-b border-white/5 bg-[var(--color-surface)]">
                    <img src="/logo-damaf.png" alt="DamafAPP" className="h-12 w-auto object-contain hover:scale-105 transition-transform" />
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden absolute right-4 text-white/50 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto custom-scrollbar">

                    {/* GESTION */}
                    <div className="space-y-1">
                        <p className="px-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Gestión</p>
                        <NavItem icon={<LayoutDashboard />} label="Vista General" active={activeTab === 'Overview'} onClick={() => { setActiveTab('Overview'); setIsSidebarOpen(false) }} />
                        <NavItem icon={<TrendingUp />} label="Métricas" active={activeTab === 'Analytics'} onClick={() => { setActiveTab('Analytics'); setIsSidebarOpen(false) }} />
                        <NavItem icon={<Users />} label="Clientes" active={activeTab === 'Customers'} onClick={() => { setActiveTab('Customers'); setIsSidebarOpen(false) }} />
                    </div>

                    {/* OPERATIVO */}
                    <div className="space-y-1">
                        <p className="px-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Operativo</p>
                        <NavItem icon={<ShoppingCart />} label="Pedidos" active={activeTab === 'Orders'} onClick={() => { setActiveTab('Orders'); setIsSidebarOpen(false) }} />
                        <NavItem icon={<Monitor />} label="POS Live" onClick={() => navigate('/admin/pos')} />
                        <NavItem icon={<Users />} label="Repartidores" active={activeTab === 'Drivers'} onClick={() => { setActiveTab('Drivers'); setIsSidebarOpen(false) }} />
                        <NavItem icon={<Clock />} label="Horarios de Entrega" active={activeTab === 'Slots'} onClick={() => { setActiveTab('Slots'); setIsSidebarOpen(false) }} />
                        <NavItem icon={<DollarSign />} label="Caja" active={activeTab === 'Cash'} onClick={() => { setActiveTab('Cash'); setIsSidebarOpen(false) }} />
                        <NavItem icon={<Package />} label="Inventario" active={activeTab === 'Inventory'} onClick={() => { setActiveTab('Inventory'); setIsSidebarOpen(false) }} />
                    </div>

                    {/* CATALOGO */}
                    <div className="space-y-1">
                        <p className="px-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Catálogo</p>
                        <NavItem icon={<UtensilsCrossed />} label="Menú" active={activeTab === 'Menu'} onClick={() => { setActiveTab('Menu'); setIsSidebarOpen(false) }} />
                        <NavItem icon={<Layers />} label="Extras" active={activeTab === 'Modifiers'} onClick={() => { setActiveTab('Modifiers'); setIsSidebarOpen(false) }} />
                    </div>

                    {/* MARKETING */}
                    <div className="space-y-1">
                        <p className="px-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Marketing</p>
                        <NavItem icon={<Gift />} label="Canjes" active={activeTab === 'Canjes'} onClick={() => { setActiveTab('Canjes'); setIsSidebarOpen(false) }} />
                        <NavItem icon={<Ticket />} label="Cupones" active={activeTab === 'Cupones'} onClick={() => { setActiveTab('Cupones'); setIsSidebarOpen(false) }} />
                        <NavItem icon={<Newspaper />} label="Novedades" active={activeTab === 'Novedades'} onClick={() => { setActiveTab('Novedades'); setIsSidebarOpen(false) }} />
                    </div>

                    {/* SISTEMA */}
                    <div className="space-y-1">
                        <p className="px-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Sistema</p>
                        <NavItem icon={<Settings />} label="Configuración" active={activeTab === 'Settings'} onClick={() => { setActiveTab('Settings'); setIsSidebarOpen(false) }} />
                    </div>

                </nav>

                <div className="p-4 border-t border-white/5 bg-[var(--color-surface)]">
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
                ) : activeTab === 'Analytics' ? (
                    <AnalyticsManager />
                ) : activeTab === 'Drivers' ? (
                    <DriversManager />
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
                ) : activeTab === 'Modifiers' ? (
                    <ModifiersManager />
                ) : activeTab === 'Availability' ? (
                    <InventoryManager />
                ) : activeTab === 'Inventory' ? (
                    <IngredientManager />
                ) : activeTab === 'Customers' ? (
                    <CustomersManager />
                ) : activeTab === 'Settings' ? (
                    <SettingsManager />
                ) : activeTab === 'Slots' ? (
                    <SlotManager />
                ) : (
                    <AdminOverview />
                )}
            </main>
        </div>
    )
}

// Helper Components
const NavItem = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${active ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-purple-900/20' : 'text-[var(--color-text-muted)] hover:bg-white/5 hover:text-white'}`}>
        {icon && <span className="w-4 h-4">{icon}</span>}
        <span className="font-medium text-sm">{label}</span>
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
