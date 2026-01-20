import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Loader2, TrendingUp, Users, ShoppingBag, Package, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import QRCode from 'react-qr-code'

import OverviewSkeleton from './skeletons/OverviewSkeleton'

const AdminOverview = () => {
    const [stats, setStats] = useState({
        totalRevenue: 0,
        activeOrders: 0,
        totalProducts: 0,
        totalUsers: 0,
        currentCash: 0,
        cashStatus: 'closed'
    })
    // Removed unused recentOrders state
    const [loading, setLoading] = useState(true)
    const origin = window.location.origin

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        setLoading(true)
        try {
            // Parallel Execution for independent queries
            const [
                revenueResult,
                activeOrdersResult,
                productsResult,
                usersResult,
                cashRegisterResult
            ] = await Promise.all([
                // 1. Total Revenue (Optimized RPC)
                supabase.rpc('get_total_revenue'),

                // 2. Active Orders
                supabase
                    .from('orders')
                    .select('*', { count: 'exact', head: true })
                    .in('status', ['pending', 'preparing', 'ready']),

                // 3. Total Products
                supabase
                    .from('products')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_available', true),

                // 4. Registered Users
                supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true }),

                // 5. Open Cash Register
                supabase
                    .from('cash_registers')
                    .select('id, opening_amount')
                    .eq('status', 'open')
                    .single()
            ])

            // Parse Results
            const totalRevenue = revenueResult.data || 0
            const activeOrders = activeOrdersResult.count || 0
            const totalProducts = productsResult.count || 0
            const totalUsers = usersResult.count || 0

            // Cash Logic (Dependent on open register)
            let currentCash = 0
            let cashStatus = 'closed'
            const openRegister = cashRegisterResult.data

            if (openRegister) {
                cashStatus = 'open'
                // This query must be sequential as it depends on register ID, but it's fast.
                // We could optimize further by joining or RPC but this is acceptable for now.
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
                activeOrders,
                totalProducts,
                totalUsers,
                currentCash,
                cashStatus
            })

        } catch (error) {
            console.error("Error fetching dashboard data:", error)
        }
        setLoading(false)
    }

    if (loading) return <OverviewSkeleton />

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



            {/* Recent Orders Removed as per user request */}
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
