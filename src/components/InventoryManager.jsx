import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Search, Save, AlertTriangle, CheckCircle, PackageOpen, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

const InventoryManager = () => {
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filter, setFilter] = useState('all') // all, low, out

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        const [prodRes, catRes] = await Promise.all([
            supabase.from('products').select('*').order('name'),
            supabase.from('categories').select('*').order('sort_order')
        ])

        if (prodRes.data) setProducts(prodRes.data)
        if (catRes.data) setCategories(catRes.data)
        setLoading(false)
    }

    const updateStock = async (id, newStock) => {
        const { error } = await supabase
            .from('products')
            .update({ stock: newStock === '' ? null : parseInt(newStock) })
            .eq('id', id)

        if (!error) {
            setProducts(products.map(p => p.id === id ? { ...p, stock: newStock === '' ? null : parseInt(newStock) } : p))
            toast.success('Stock actualizado')
        } else {
            toast.error('Error al actualizar stock')
        }
    }

    const toggleAvailability = async (id, currentStatus) => {
        const { error } = await supabase
            .from('products')
            .update({ is_available: !currentStatus })
            .eq('id', id)

        if (!error) {
            setProducts(products.map(p => p.id === id ? { ...p, is_available: !currentStatus } : p))
            toast.success(currentStatus ? 'Producto pausado' : 'Producto activado')
        } else {
            toast.error('Error al cambiar disponibilidad')
        }
    }

    // Filter Logic
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase())
        let matchesFilter = true

        if (filter === 'low') matchesFilter = p.stock !== null && p.stock < 10 && p.stock > 0
        if (filter === 'out') matchesFilter = (p.stock !== null && p.stock === 0) || !p.is_available

        return matchesSearch && matchesFilter
    })

    // Group by Category
    const groupedProducts = categories.map(cat => ({
        ...cat,
        items: filteredProducts.filter(p => p.category_id === cat.id)
    })).filter(group => group.items.length > 0)

    // Stats
    const lowStockCount = products.filter(p => p.stock !== null && p.stock < 10 && p.stock > 0).length
    const outOfStockCount = products.filter(p => (p.stock !== null && p.stock === 0) || !p.is_available).length

    if (loading) return <div className="p-10 text-center">Cargando inventario...</div>

    return (
        <div className="space-y-6">
            {/* Stats Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[var(--color-surface)] p-4 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                        <p className="text-[var(--color-text-muted)] text-xs uppercase mb-1">Total Productos</p>
                        <h3 className="text-2xl font-bold">{products.length}</h3>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                        <PackageOpen className="w-6 h-6" />
                    </div>
                </div>
                <div onClick={() => setFilter(filter === 'low' ? 'all' : 'low')} className={`cursor-pointer bg-[var(--color-surface)] p-4 rounded-xl border transition-all flex items-center justify-between ${filter === 'low' ? 'border-yellow-500 ring-1 ring-yellow-500' : 'border-white/5 hover:border-yellow-500/50'}`}>
                    <div>
                        <p className="text-[var(--color-text-muted)] text-xs uppercase mb-1">Stock Bajo</p>
                        <h3 className="text-2xl font-bold text-yellow-500">{lowStockCount}</h3>
                    </div>
                    <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-500">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                </div>
                <div onClick={() => setFilter(filter === 'out' ? 'all' : 'out')} className={`cursor-pointer bg-[var(--color-surface)] p-4 rounded-xl border transition-all flex items-center justify-between ${filter === 'out' ? 'border-red-500 ring-1 ring-red-500' : 'border-white/5 hover:border-red-500/50'}`}>
                    <div>
                        <p className="text-[var(--color-text-muted)] text-xs uppercase mb-1">Agotados / No Disponibles</p>
                        <h3 className="text-2xl font-bold text-red-500">{outOfStockCount}</h3>
                    </div>
                    <div className="p-3 bg-red-500/10 rounded-lg text-red-500">
                        <RotateCcw className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Filters bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[var(--color-surface)] p-4 rounded-xl border border-white/5">
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[var(--color-background)] rounded-lg pl-9 pr-4 py-2 text-sm outline-none border border-white/10 focus:border-[var(--color-primary)]"
                    />
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-white/5 text-[var(--color-text-muted)]'}`}>Todos</button>
                    <button onClick={() => setFilter('low')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'low' ? 'bg-yellow-500/20 text-yellow-500' : 'hover:bg-white/5 text-[var(--color-text-muted)]'}`}>Stock Bajo</button>
                    <button onClick={() => setFilter('out')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'out' ? 'bg-red-500/20 text-red-500' : 'hover:bg-white/5 text-[var(--color-text-muted)]'}`}>Agotados</button>
                </div>
            </div>

            {/* Inventory List */}
            <div className="space-y-6">
                {groupedProducts.map(group => (
                    <div key={group.id} className="bg-[var(--color-surface)] rounded-xl border border-white/5 overflow-hidden">
                        <div className="bg-[var(--color-background)]/50 px-6 py-3 border-b border-white/5">
                            <h3 className="font-bold text-[var(--color-secondary)] uppercase text-sm tracking-wider">{group.name}</h3>
                        </div>
                        <div className="divide-y divide-white/5">
                            {group.items.map(item => (
                                <div key={item.id} className="p-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className={`font-bold ${!item.is_available ? 'text-[var(--color-text-muted)] line-through' : ''}`}>{item.name}</h4>
                                            {!item.is_available && <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded uppercase font-bold">Pausado</span>}
                                            {item.stock !== null && item.stock === 0 && <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded uppercase font-bold">Agotado</span>}
                                        </div>
                                        <p className="text-xs text-[var(--color-text-muted)] truncate">{item.description}</p>
                                    </div>

                                    {/* Controls */}
                                    <div className="flex items-center gap-6">
                                        {/* Stock Control */}
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] uppercase text-[var(--color-text-muted)] mb-1">Stock</span>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    placeholder="∞"
                                                    value={item.stock === null ? '' : item.stock}
                                                    onChange={(e) => updateStock(item.id, e.target.value)}
                                                    className={`w-16 bg-[var(--color-background)] text-center text-sm p-1.5 rounded border outline-none focus:border-[var(--color-secondary)] ${item.stock !== null && item.stock < 5 ? 'border-red-500 text-red-500' : 'border-white/10'}`}
                                                />
                                            </div>
                                        </div>

                                        {/* Availability Toggle */}
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] uppercase text-[var(--color-text-muted)] mb-1">Disponible</span>
                                            <button
                                                onClick={() => toggleAvailability(item.id, item.is_available)}
                                                className={`w-10 h-6 rounded-full relative transition-colors ${item.is_available ? 'bg-green-500' : 'bg-gray-600'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${item.is_available ? 'left-5' : 'left-1'}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {groupedProducts.length === 0 && (
                    <div className="text-center py-10 text-[var(--color-text-muted)]">
                        <PackageOpen className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>No se encontraron productos.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default InventoryManager
