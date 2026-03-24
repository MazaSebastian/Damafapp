import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTenantNav } from '../hooks/useTenantNav'
import { useTenant } from '../context/TenantContext'
import { LayoutDashboard, Package, ShoppingCart, Users, Settings, Newspaper, Gift, UtensilsCrossed, Ticket, Menu, X, Loader2, LogOut, DollarSign, ChefHat, Layers, TrendingUp, Clock, Bell, MessageCircle, FileText, Puzzle } from 'lucide-react'
import { useRealtimeConnection } from '../hooks/useRealtimeConnection'
import NewsManager from '../components/NewsManager'
import RewardsManager from '../components/RewardsManager'
import ProductManager from '../components/ProductManager'
import OrdersManager from '../components/OrdersManager'
import SettingsManager from '../components/SettingsManager'
import AdminOverview from '../components/AdminOverview'
import CouponsManager from '../components/CouponsManager'
import InventoryManager from '../components/InventoryManager'
import CustomersManager from '../components/CustomersManager'

import CashManager from '../components/CashManager'
import ModifiersManager from '../components/ModifiersManager'
import AnalyticsManager from '../components/AnalyticsManager'
import SlotManager from '../components/admin/SlotManager'
import IngredientManager from '../components/admin/IngredientManager'
import DriversManager from '../components/DriversManager'
import NotificationsManager from '../components/NotificationsManager'
import SocialManager from '../components/SocialManager'
import { supabase } from '../supabaseClient'
import { toast } from 'sonner'
import NewOrderAlert from '../components/NewOrderAlert'
import BillingManager from '../components/billing/BillingManager'


const AdminDashboard = () => {
    const { user, role, loading, signOut } = useAuth()
    const navigate = useNavigate()
    const tenantNav = useTenantNav()
    const { tenantId, tenantLogo, tenantName } = useTenant()
    const [activeTab, setActiveTab] = useState('Overview')
    const [isSidebarOpen, setIsSidebarOpen] = useState(0)
    const [pendingOrdersCount, setPendingOrdersCount] = useState(0)
    const [lowStockCount, setLowStockCount] = useState(0)
    const [alertOrder, setAlertOrder] = useState(null)

    // Badge Logic
    const fetchCounts = async () => {
        if (!user) return
        const tid = tenantId
        if (!tid) return

        // Orders: Pending (scoped to tenant)
        const { count: ordersCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')
            .eq('tenant_id', tid)

        if (ordersCount !== null) setPendingOrdersCount(ordersCount)

        // Inventory: Low Stock (Ingredients + Products — scoped to tenant)
        let lowCount = 0

        // 1. Ingredients
        const { data: ingredients } = await supabase
            .from('ingredients')
            .select('stock, min_stock')
            .eq('tenant_id', tid)

        if (ingredients) {
            lowCount += ingredients.filter(i => i.stock <= i.min_stock).length
        }

        // 2. Products
        const { data: products } = await supabase
            .from('products')
            .select('stock')
            .eq('is_available', true)
            .eq('tenant_id', tid)

        if (products) {
            lowCount += products.filter(p => p.stock !== null && p.stock === 0).length
        }

        setLowStockCount(lowCount)
    }

    // Initial Load
    useEffect(() => {
        fetchCounts()
    }, [user])

    // Auto-Refresh on Visibility/Focus (and every 60s)
    useRealtimeConnection(fetchCounts, [user], 'AdminDashboard', 60000)


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

    // Global Real-time Subscription (scoped to tenant)
    useEffect(() => {
        if (!user || !tenantId) return

        const channel = supabase
            .channel(`admin_alerts_${tenantId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'orders',
                filter: `tenant_id=eq.${tenantId}`
            }, (payload) => {
                playNewOrderSound()
                setAlertOrder(payload.new)
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user, tenantId])


    useEffect(() => {
        if (!loading) {
            if (!user) {
                tenantNav.navigate('/login')
            } else if (role !== 'admin' && role !== 'owner') {
                console.warn('Unauthorized access attempt by:', user.email, 'Role:', role)
                if (role === 'user') {
                    tenantNav.navigate('/')
                }
            }
        }
    }, [user, role, loading, navigate])

    const handleLogout = async () => {
        await signOut()
        tenantNav.navigate('/login')
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
            <Loader2 className="w-10 h-10 animate-spin text-[var(--color-primary)]" />
        </div>
    )

    if (!user || (role !== 'admin' && role !== 'owner')) {
        // If we have a user but no role (and not loading), it means Profile Fetch Failed.
        if (user && !role) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-background)] p-4 text-center">
                    <div className="bg-red-500/10 p-4 rounded-full mb-4">
                        <X className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Error al cargar perfil</h2>
                    <p className="text-[var(--color-text-muted)] mb-6">No se pudo obtener tu rol de usuario.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg font-bold hover:brightness-110 transition-all"
                    >
                        Reintentar
                    </button>
                    <button
                        onClick={handleLogout}
                        className="mt-4 text-sm text-[var(--color-text-muted)] hover:text-white"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            )
        }
        return null
    }

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
                    <img src={tenantLogo || '/logo-stacked.png'} alt={tenantName} className="h-12 w-auto object-contain hover:scale-105 transition-transform" />
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
                        <NavItem icon={<FileText />} label="Centro de Facturación" active={activeTab === 'Billing'} onClick={() => { setActiveTab('Billing'); setIsSidebarOpen(false) }} />
                        <NavItem icon={<Users />} label="Clientes" active={activeTab === 'Customers'} onClick={() => { setActiveTab('Customers'); setIsSidebarOpen(false) }} />
                        <NavItem icon={<MessageCircle />} label="Mensajes" active={activeTab === 'Messages'} onClick={() => { setActiveTab('Messages'); setIsSidebarOpen(false) }} />
                    </div>

                    {/* OPERATIVO */}
                    <div className="space-y-1">
                        <p className="px-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Operativo</p>
                        <NavItem icon={<ShoppingCart />} label="Pedidos" badge={pendingOrdersCount} active={activeTab === 'Orders'} onClick={() => { setActiveTab('Orders'); setIsSidebarOpen(false) }} />

                        <NavItem icon={<Users />} label="Repartidores" active={activeTab === 'Drivers'} onClick={() => { setActiveTab('Drivers'); setIsSidebarOpen(false) }} />
                        <NavItem icon={<Clock />} label="Horarios de Entrega" active={activeTab === 'Slots'} onClick={() => { setActiveTab('Slots'); setIsSidebarOpen(false) }} />
                        <NavItem icon={<DollarSign />} label="Caja" active={activeTab === 'Cash'} onClick={() => { setActiveTab('Cash'); setIsSidebarOpen(false) }} />
                        <NavItem icon={<Package />} label="Inventario" badge={lowStockCount} active={activeTab === 'Inventory'} onClick={() => { setActiveTab('Inventory'); setIsSidebarOpen(false) }} />
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
                        <NavItem icon={<Bell />} label="Notificaciones" active={activeTab === 'Notifications'} onClick={() => { setActiveTab('Notifications'); setIsSidebarOpen(false) }} />
                    </div>

                    {/* SISTEMA */}
                    <div className="space-y-1">
                        <p className="px-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Sistema</p>
                        <NavItem icon={<Settings />} label="Configuración" active={activeTab === 'Settings'} onClick={() => { setActiveTab('Settings'); setIsSidebarOpen(false) }} />
                        <NavItem icon={<Puzzle />} label="Integraciones" active={false} onClick={() => { setIsSidebarOpen(false); tenantNav.navigate('/admin/integraciones') }} />
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
                ) : activeTab === 'Messages' ? (
                    <SocialManager />
                ) : activeTab === 'Analytics' ? (
                    <AnalyticsManager />
                ) : activeTab === 'Billing' ? (
                    <BillingManager />
                ) : activeTab === 'Drivers' ? (
                    <DriversManager />
                ) : activeTab === 'Notifications' ? (
                    <NotificationsManager />
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

            <NewOrderAlert
                isOpen={!!alertOrder}
                order={alertOrder}
                onClose={() => setAlertOrder(null)}
                onView={() => setActiveTab('Orders')}
            />
        </div>
    )
}

// Helper Components
const NavItem = ({ icon, label, active, onClick, badge }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all relative ${active ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-purple-900/20' : 'text-[var(--color-text-muted)] hover:bg-white/5 hover:text-white'}`}>
        {icon && <span className="w-4 h-4">{icon}</span>}
        <span className="font-medium text-sm flex-1 text-left">{label}</span>
        {badge > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] grid place-items-center animate-pulse">
                {badge}
            </span>
        )}
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
