import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { User, Mail, Star, ShoppingBag, DollarSign, Search, Plus, Copy, Check, Phone } from 'lucide-react'
import { toast } from 'sonner'
import CreateCustomerModal from './modals/CreateCustomerModal'

const CustomersManager = () => {
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [copiedId, setCopiedId] = useState(null)

    useEffect(() => {
        fetchCustomers()
    }, [])

    const fetchCustomers = async () => {
        setLoading(true)

        // Fetch profiles
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })

        if (profileError) {
            toast.error('Error al cargar clientes')
            setLoading(false)
            return
        }

        // Fetch aggregated order stats per user
        // Note: Supabase doesn't support complex JOIN aggregation easily in one query without a View or RPC.
        // We will fetch all orders (lightweight select) and aggregate in JS for now, assuming user base isn't massive yet.
        // Optimization: Create a SQL View 'customer_stats' later.
        const { data: orders } = await supabase
            .from('orders')
            .select('user_id, total, status')

        const stats = {}
        if (orders) {
            orders.forEach(order => {
                if (!order.user_id) return
                if (!stats[order.user_id]) stats[order.user_id] = { count: 0, spent: 0 }

                stats[order.user_id].count += 1
                if (order.status !== 'cancelled' && order.status !== 'rejected') {
                    stats[order.user_id].spent += order.total
                }
            })
        }

        const enrichedCustomers = profiles.map(p => ({
            ...p,
            orderCount: stats[p.id]?.count || 0,
            totalSpent: stats[p.id]?.spent || 0
        }))

        setCustomers(enrichedCustomers)
        setLoading(false)
    }

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
        setCopiedId(text)
        toast.success('ID copiado al portapapeles')
        setTimeout(() => setCopiedId(null), 2000)
    }

    const filteredCustomers = customers.filter(c =>
        (c.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.first_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.last_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    )

    if (loading) return <div className="p-10 text-center text-gray-400 flex items-center justify-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div> Cargando clientes...</div>

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Clientes</h2>
                    <p className="text-gray-400">Gestiona y visualiza tu base de clientes</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#e00201]/50 focus:ring-1 focus:ring-[#e00201]/50 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#e00201] hover:bg-[#c00201] text-white rounded-xl transition-all shadow-lg shadow-[#e00201]/20 font-medium whitespace-nowrap"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">Nuevo Cliente</span>
                    </button>
                </div>
            </div>

            <div className="grid gap-4">
                {filteredCustomers.map((customer) => (
                    <div
                        key={customer.id}
                        className="group bg-[#1a1a1a] border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all hover:bg-[#202020]"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#e00201]/20 to-purple-500/20 flex items-center justify-center border border-white/5">
                                    <span className="text-lg font-bold text-white">
                                        {customer.first_name?.[0]?.toUpperCase() || '?'}
                                    </span>
                                </div>
                                <div>
                                    <div className="font-medium text-white flex items-center gap-2">
                                        {customer.first_name || 'Sin nombre'} {customer.last_name}
                                        {/* ID Badge */}
                                        <div
                                            onClick={() => copyToClipboard(customer.id)}
                                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 cursor-pointer text-gray-500 hover:text-gray-300 transition-colors"
                                            title="Copiar ID"
                                        >
                                            {customer.id.slice(0, 8)}...
                                            {copiedId === customer.id ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-400 flex items-center gap-1">
                                        <Mail size={12} />
                                        {customer.email || 'Sin email'}
                                    </div>
                                    {customer.phone && (
                                        <div className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                                            <Phone size={12} />
                                            {customer.phone}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 uppercase">Pedidos</div>
                                    <div className="font-medium text-white flex items-center justify-end gap-1">
                                        <ShoppingBag size={14} className="text-blue-400" />
                                        {customer.orderCount}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 uppercase">Inversión</div>
                                    <div className="font-medium text-white flex items-center justify-end gap-1">
                                        <DollarSign size={14} className="text-green-400" />
                                        {customer.totalSpent.toLocaleString()}
                                    </div>
                                </div>
                                {/* Stars/Loyalty placeholder if needed */}
                                {customer.stars > 0 && (
                                    <div className="text-right hidden sm:block">
                                        <div className="text-xs text-gray-500 uppercase">Puntos</div>
                                        <div className="font-medium text-yellow-500 flex items-center justify-end gap-1">
                                            <Star size={14} fill="currentColor" />
                                            {customer.stars}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {filteredCustomers.length === 0 && (
                    <div className="p-12 text-center text-gray-500 bg-[#1a1a1a] rounded-xl border border-white/5">
                        <User size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No se encontraron clientes.</p>
                    </div>
                )}
            </div>

            <CreateCustomerModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCustomerCreated={fetchCustomers}
            />
        </div>
    )
}

export default CustomersManager
