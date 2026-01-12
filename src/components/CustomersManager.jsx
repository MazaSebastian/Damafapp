import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { User, Mail, Star, ShoppingBag, DollarSign, Search } from 'lucide-react'
import { toast } from 'sonner'

const CustomersManager = () => {
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

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

    const filteredCustomers = customers.filter(c =>
        (c.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    )

    if (loading) return <div className="p-10 text-center text-[var(--color-text-muted)]">Cargando clientes...</div>

    return (
        <div className="space-y-6">
            {/* Stats Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[var(--color-surface)] p-4 rounded-xl border border-white/5 flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[var(--color-text-muted)] text-xs uppercase">Total Clientes</p>
                        <h3 className="text-2xl font-bold">{customers.length}</h3>
                    </div>
                </div>
                <div className="bg-[var(--color-surface)] p-4 rounded-xl border border-white/5 flex items-center gap-4">
                    <div className="p-3 bg-green-500/10 rounded-lg text-green-400">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[var(--color-text-muted)] text-xs uppercase">Ticket Promedio</p>
                        <h3 className="text-2xl font-bold">
                            ${customers.length ? (customers.reduce((acc, c) => acc + c.totalSpent, 0) / customers.length).toFixed(0) : 0}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                <input
                    type="text"
                    placeholder="Buscar por email o nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[var(--color-surface)] rounded-xl pl-10 pr-4 py-3 text-sm outline-none border border-white/5 focus:border-[var(--color-secondary)]"
                />
            </div>

            {/* List */}
            <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--color-background)]/50 text-[var(--color-text-muted)] uppercase text-xs font-bold">
                            <tr>
                                <th className="p-4">Usuario</th>
                                <th className="p-4 text-center">Pedidos</th>
                                <th className="p-4 text-center">Inversión Total</th>
                                <th className="p-4 text-center">Fidelidad</th>
                                <th className="p-4">Registro</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredCustomers.map(customer => (
                                <tr key={customer.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[var(--color-background)] flex items-center justify-center font-bold text-[var(--color-secondary)] border border-white/10">
                                                {customer.email ? customer.email[0].toUpperCase() : '?'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white">{customer.full_name || 'Sin nombre'}</p>
                                                <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                                                    <Mail className="w-3 h-3" /> {customer.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-400 px-2 py-1 rounded text-xs font-bold">
                                            <ShoppingBag className="w-3 h-3" /> {customer.orderCount}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center font-bold text-green-400">
                                        ${customer.totalSpent.toLocaleString()}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded text-xs font-bold">
                                            <Star className="w-3 h-3 fill-yellow-500" /> {customer.stars}
                                        </span>
                                    </td>
                                    <td className="p-4 text-[var(--color-text-muted)] text-xs">
                                        {new Date(customer.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                            {filteredCustomers.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-[var(--color-text-muted)]">
                                        No se encontraron clientes.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default CustomersManager
