import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { subDays, startOfDay, endOfDay, format } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell } from 'recharts'
import { Loader2, TrendingUp, Calendar, DollarSign, Users, ShoppingBag } from 'lucide-react'
import { calculateKPIs, getDailyRevenueData, getHourlyHeatmapData, getTopProductsData } from '../utils/analyticsUtils'
import GeoHeatmap from './GeoHeatmap'

const AnalyticsManager = () => {
    const [dateRange, setDateRange] = useState('7') // '7', '30', 'month', 'custom'
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')

    const [loading, setLoading] = useState(true)
    const [data, setData] = useState({
        kpis: { totalRevenue: 0, totalOrders: 0, averageTicket: 0, paymentMethods: {} },
        revenueChart: [],
        hourlyChart: [],
        topProducts: [],
        orders: [] // NEW: Store raw orders for Heatmap
    })

    useEffect(() => {
        if (dateRange !== 'custom') {
            fetchAnalyticsData()
        } else if (customStart && customEnd) {
            fetchAnalyticsData()
        }
    }, [dateRange, customStart, customEnd])

    const fetchAnalyticsData = async () => {
        setLoading(true)
        try {
            // Determine date range
            const now = new Date()
            let startDate = subDays(now, 7)
            let endDate = endOfDay(now)

            if (dateRange === '30') startDate = subDays(now, 30)
            if (dateRange === 'month') startDate = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1))

            if (dateRange === 'custom') {
                if (!customStart || !customEnd) {
                    setLoading(false)
                    return
                }
                const start = new Date(customStart)
                // Add timezone offset correction or treat as local YYYY-MM-DD
                // Simple fix: append T00:00:00
                startDate = startOfDay(new Date(customStart + 'T00:00:00'))
                endDate = endOfDay(new Date(customEnd + 'T00:00:00'))
            }

            // Fetch orders
            const { data: orders, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    order_items (
                        *,
                        products (name)
                    )
                `)
                .in('status', ['paid', 'completed', 'preparing', 'ready', 'sent', 'pending']) // Include all valid active/historical statuses
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())
                .order('created_at', { ascending: true })

            if (error) throw error

            // Process Data
            const kpis = calculateKPIs(orders)
            // Calculate days diff for chart granularity
            const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1
            const revenueChart = getDailyRevenueData(orders, diffDays)
            const hourlyChart = getHourlyHeatmapData(orders)
            const topProducts = getTopProductsData(orders)

            setData({ kpis, revenueChart, hourlyChart, topProducts, orders })

        } catch (err) {
            console.error('Error fetching analytics:', err)
        } finally {
            setLoading(false)
        }
    }

    if (loading && dateRange !== 'custom') return <div className="h-96 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-[var(--color-secondary)]" /></div>

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header & Controls */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                        <TrendingUp className="text-[var(--color-secondary)] w-8 h-8" />
                        Métricas & Análisis
                    </h2>
                    <p className="text-[var(--color-text-muted)] mt-1">Visión estratégica de tu negocio</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center w-full xl:w-auto">

                    {dateRange === 'custom' && (
                        <div className="flex items-center gap-2 bg-[var(--color-surface)] p-1 rounded-xl border border-white/5 animate-in slide-in-from-right">
                            <input
                                type="date"
                                value={customStart}
                                onChange={e => setCustomStart(e.target.value)}
                                className="bg-transparent text-white text-sm p-2 outline-none border-r border-white/10"
                            />
                            <span className="text-white/50">-</span>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={e => setCustomEnd(e.target.value)}
                                className="bg-transparent text-white text-sm p-2 outline-none"
                            />
                        </div>
                    )}

                    <div className="bg-[var(--color-surface)] p-1 rounded-xl flex border border-white/5 w-full sm:w-auto overflow-x-auto">
                        {['7', '30', 'month', 'custom'].map(range => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${dateRange === range
                                    ? 'bg-[var(--color-secondary)] text-white shadow-lg'
                                    : 'text-[var(--color-text-muted)] hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {range === '7' && 'Últimos 7 días'}
                                {range === '30' && 'Últimos 30 días'}
                                {range === 'month' && 'Este Mes'}
                                {range === 'custom' && 'Personalizado'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* KPIs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Ingresos Totales"
                    value={`$${data.kpis.totalRevenue.toLocaleString()}`}
                    icon={<DollarSign className="text-green-400" />}
                    trend="vs periodo anterior" // Todo: implement comparison
                />
                <KPICard
                    title="Ticket Promedio"
                    value={`$${Math.round(data.kpis.averageTicket).toLocaleString()}`}
                    icon={<ShoppingBag className="text-blue-400" />}
                />
                <KPICard
                    title="Total Pedidos"
                    value={data.kpis.totalOrders}
                    icon={<TrendingUp className="text-orange-400" />}
                />
                <KPICard
                    title="Conversion"
                    value="--" // Placeholder
                    icon={<Users className="text-purple-400" />}
                    disabled
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Revenue Trend */}
                <div className="bg-[var(--color-surface)] p-6 rounded-3xl border border-white/5 shadow-2xl">
                    <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                        Tendencia de Ventas
                    </h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.revenueChart}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="rgba(255,255,255,0.3)"
                                    tick={{ fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="rgba(255,255,255,0.3)"
                                    tickFormatter={(value) => `$${value / 1000}k`}
                                    tick={{ fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    formatter={(value) => [`$${value.toLocaleString()}`, 'Ventas']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#22c55e"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Hourly Heatmap (Simple Bar for now) */}
                <div className="bg-[var(--color-surface)] p-6 rounded-3xl border border-white/5 shadow-2xl">
                    <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-orange-400" />
                        Horas Pico
                    </h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.hourlyChart.slice(10, 24)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="rgba(255,255,255,0.3)"
                                    tick={{ fontSize: 10 }}
                                    interval={0}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                />
                                <Bar dataKey="orders" fill="#f97316" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                        <p className="text-center text-xs text-white/30 mt-2">Mostrando 10:00 - 23:00</p>
                    </div>
                </div>

                {/* Top Products */}
                <div className="bg-[var(--color-surface)] p-6 rounded-3xl border border-white/5 shadow-2xl lg:col-span-2">
                    <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-purple-400" />
                        Productos Más Vendidos
                    </h3>
                    <div className="space-y-4">
                        {data.topProducts.map((product, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--color-background)] border border-white/5">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                                    ${idx === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                                        idx === 1 ? 'bg-gray-400/20 text-gray-400' :
                                            idx === 2 ? 'bg-orange-700/20 text-orange-700' : 'bg-white/5 text-white/50'}
                                `}>
                                    #{idx + 1}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-lg">{product.name}</h4>
                                    <div className="w-full bg-white/5 rounded-full h-2 mt-2 overflow-hidden">
                                        <div
                                            className="h-full bg-[var(--color-secondary)] rounded-full transition-all duration-1000"
                                            style={{ width: `${(product.count / data.topProducts[0].count) * 100}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block text-2xl font-black">{product.count}</span>
                                    <span className="text-xs text-[var(--color-text-muted)]">vendidos</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>


                {/* Geographic Heatmap */}
                <div className="lg:col-span-2">
                    <GeoHeatmap orders={data.orders} />
                </div>
            </div>
        </div>
    )
}

const KPICard = ({ title, value, icon, trend, disabled }) => (
    <div className={`p-6 rounded-3xl border flex flex-col justify-between h-40 relative overflow-hidden transition-all
        ${disabled
            ? 'bg-white/5 border-white/5 opacity-50 grayscale'
            : 'bg-[var(--color-surface)] border-white/5 hover:border-white/10 hover:shadow-2xl shadow-black/20'
        }
    `}>
        <div className="absolute top-0 right-0 p-5 opacity-10 scale-150">
            {icon}
        </div>
        <div className="flex items-start justify-between relative z-10">
            <div>
                <h4 className="text-[var(--color-text-muted)] text-sm font-bold uppercase tracking-wider mb-2">{title}</h4>
                <span className="text-4xl font-black text-white tracking-tighter">{value}</span>
            </div>
            {!disabled && <div className="p-3 bg-white/5 rounded-2xl">{icon}</div>}
        </div>
        {trend && (
            <div className="relative z-10 text-xs font-bold text-green-400 flex items-center gap-1 mt-auto">
                <TrendingUp className="w-3 h-3" /> {trend}
            </div>
        )}
    </div>
)

export default AnalyticsManager
