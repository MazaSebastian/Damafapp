import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Loader2, TrendingUp, Users, ShoppingBag, Package, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const AdminOverview = () => {
    const [stats, setStats] = useState({
        totalRevenue: 0,
        activeOrders: 0,
        totalProducts: 0,
        totalUsers: 0
    })
    const [recentOrders, setRecentOrders] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        setLoading(true)
        try {
            // 1. Total Revenue (Paid/Completed orders)
            // Note: This matches all time. For scalability, we might limit to this month later.
            const { data: revenueData } = await supabase
                .from('orders')
                .select('total')
                .or('status.eq.paid,status.eq.completed')

            const totalRevenue = revenueData?.reduce((acc, order) => acc + (order.total || 0), 0) || 0

            // 2. Active Orders (Not cancelled, not completed/paid if flow finishes there. 
            // Usually "Active" means in kitchen or ready. Let's assume anything not cancelled/completed.)
            const { count: activeOrdersCount } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .in('status', ['pending', 'preparing', 'ready']) // Adjust statuses as per your flow

            // 3. Total Products
            const { count: productsCount } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('is_available', true) // Or all? Let's show all active.

            // 4. Registered Users
            const { count: usersCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })

            setStats({
                totalRevenue,
                activeOrders: activeOrdersCount || 0,
                totalProducts: productsCount || 0,
                totalUsers: usersCount || 0
            })

            // 5. Recent Orders
            const { data: recentData } = await supabase
                .from('orders')
                .select(`
                    id,
                    total,
                    status,
                    created_at,
                    user_id,
                    profiles:user_id (email, full_name)
                `)
                .order('created_at', { ascending: false })
                .limit(5)

            if (recentData) setRecentOrders(recentData)

            // 6. Cash Register Status
            const { data: openRegister } = await supabase
                .from('cash_registers')
                .select('id, opening_amount')
                .eq('status', 'open')
                .single()

            let currentCash = 0
            let cashStatus = 'closed'

            if (openRegister) {
                cashStatus = 'open'
                const { data: movements } = await supabase
                    .from('cash_movements')
                    .select('amount, type')
                    .eq('register_id', openRegister.id)

                const sales = movements?.filter(m => m.type === 'sale').reduce((acc, m) => acc + Number(m.amount), 0) || 0
                const deposits = movements?.filter(m => m.type === 'deposit').reduce((acc, m) => acc + Number(m.amount), 0) || 0
                const expenses = movements?.filter(m => m.type === 'expense').reduce((acc, m) => acc + Number(m.amount), 0) || 0
                const withdrawals = movements?.filter(m => m.type === 'withdrawal').reduce((acc, m) => acc + Number(m.amount), 0) || 0

                currentCash = Number(openRegister.opening_amount) + sales + deposits - expenses - withdrawals
            }

            setStats({
                totalRevenue,
                activeOrders: activeOrdersCount || 0,
                totalProducts: productsCount || 0,
                totalUsers: usersCount || 0,
                currentCash,
                cashStatus
            })

        } catch (error) {
            console.error("Error fetching dashboard data:", error)
        }
        setLoading(false)
    }

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[var(--color-primary)]" /></div>

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Ingresos Totales"
                    value={`$${stats.totalRevenue.toLocaleString()}`}
                    icon={<TrendingUp className="w-6 h-6 text-green-400" />}
                    trend="+12%" // Placeholder for now or calc vs last month
                    trendColor="text-green-400"
                />
                <StatCard
                    title="Pedidos Activos"
                    value={stats.activeOrders}
                    icon={<ShoppingBag className="w-6 h-6 text-orange-400" />}
                    trend="En cocina"
                    trendColor="text-orange-400"
                />
                <StatCard
                    title="Productos"
                    value={stats.totalProducts}
                    icon={<Package className="w-6 h-6 text-purple-400" />}
                />
                <StatCard
                    title="Usuarios"
                    value={stats.totalUsers}
                    icon={<Users className="w-6 h-6 text-blue-400" />}
                    trend="+5%"
                    trendColor="text-blue-400"
                />
                <StatCard
                    title="Caja Actual"
                    value={stats.cashStatus === 'closed' ? 'Cerrada' : `$${stats.currentCash?.toLocaleString()}`}
                    icon={<DollarSign className={`w-6 h-6 ${stats.cashStatus === 'open' ? 'text-green-400' : 'text-red-400'}`} />}
                    trend={stats.cashStatus === 'open' ? 'En vivo' : 'Requiere apertura'}
                    trendColor={stats.cashStatus === 'open' ? 'text-green-400' : 'text-red-400'}
                />
            </div>

            {/* Recent Orders */}
            <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-white/5">
                <h3 className="text-lg font-bold mb-4 text-white">Pedidos Recientes</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-[var(--color-text-muted)]">
                        <thead className="bg-[var(--color-background)]/50 text-[var(--color-text-main)] uppercase text-xs">
                            <tr>
                                <th className="p-3 rounded-l-lg">ID</th>
                                <th className="p-3">Cliente</th>
                                <th className="p-3">Estado</th>
                                <th className="p-3">Total</th>
                                <th className="p-3 rounded-r-lg">Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.length > 0 ? (
                                recentOrders.map(order => (
                                    <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="p-3 font-mono">#{order.id.slice(0, 6)}</td>
                                        <td className="p-3 font-medium text-[var(--color-text-main)]">
                                            {order.profiles?.full_name || order.profiles?.email || 'Invitado'}
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(order.status)}`}>
                                                {formatStatus(order.status)}
                                            </span>
                                        </td>
                                        <td className="p-3 font-bold text-white">${order.total}</td>
                                        <td className="p-3">{format(new Date(order.created_at), "d MMM, HH:mm", { locale: es })}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="p-4 text-center">No hay pedidos recientes</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

const StatCard = ({ title, value, icon, trend, trendColor }) => (
    <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-white/5 flex flex-col justify-between h-32 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110">
            {icon}
        </div>
        <div>
            <h4 className="text-[var(--color-text-muted)] text-sm mb-1">{title}</h4>
            <span className="text-3xl font-bold text-white tracking-tight">{value}</span>
        </div>
        {trend && (
            <div className={`text-xs font-bold ${trendColor || 'text-white'} flex items-center gap-1`}>
                {trend}
            </div>
        )}
    </div>
)

const formatStatus = (status) => {
    const map = {
        pending: 'Pendiente',
        paid: 'Pagado',
        preparing: 'En Cocina',
        ready: 'Listo',
        completed: 'Entregado',
        cancelled: 'Cancelado'
    }
    return map[status] || status
}

const getStatusColor = (status) => {
    switch (status) {
        case 'paid': return 'bg-green-500/20 text-green-500'
        case 'preparing': return 'bg-orange-500/20 text-orange-500'
        case 'ready': return 'bg-blue-500/20 text-blue-500'
        case 'completed': return 'bg-purple-500/20 text-purple-500'
        case 'cancelled': return 'bg-red-500/20 text-red-500'
        default: return 'bg-gray-500/20 text-gray-500'
    }
}

export default AdminOverview
