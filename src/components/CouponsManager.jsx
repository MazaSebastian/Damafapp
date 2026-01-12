import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Ticket, Plus, Trash2, StopCircle, PlayCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const CouponsManager = () => {
    const [coupons, setCoupons] = useState([])
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [formData, setFormData] = useState({
        code: '',
        discount_type: 'percentage', // percentage | fixed | product
        value: '',
        target_product_id: '',
        usage_limit: ''
    })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        const { data: couponsData } = await supabase.from('coupons').select(`
            *,
            products (name)
        `).order('created_at', { ascending: false })

        const { data: productsData } = await supabase.from('products').select('id, name').order('name')

        if (couponsData) setCoupons(couponsData)
        if (productsData) setProducts(productsData)
        setLoading(false)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.code) return toast.error('El código es obligatorio')
        if (formData.discount_type !== 'product' && !formData.value) return toast.error('El valor es obligatorio')
        if (formData.discount_type === 'product' && !formData.target_product_id) return toast.error('Debes seleccionar un producto')

        const { error } = await supabase.from('coupons').insert([{
            code: formData.code.toUpperCase(),
            discount_type: formData.discount_type,
            value: formData.discount_type === 'product' ? 0 : parseFloat(formData.value),
            target_product_id: formData.discount_type === 'product' ? formData.target_product_id : null,
            usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
            is_active: true
        }])

        if (error) {
            toast.error('Error: ' + error.message)
        } else {
            setFormData({ code: '', discount_type: 'percentage', value: '', target_product_id: '', usage_limit: '' })
            setShowForm(false)
            toast.success('Cupón creado exitosamente')
            fetchData()
        }
    }

    const toggleStatus = async (id, currentStatus) => {
        await supabase.from('coupons').update({ is_active: !currentStatus }).eq('id', id)
        fetchData()
    }

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar cupón?')) return
        await supabase.from('coupons').delete().eq('id', id)
        fetchData()
    }

    if (loading) return <Loader2 className="animate-spin" />

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Ticket className="text-[var(--color-secondary)]" />
                    Gestor de Cupones
                </h2>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-[var(--color-secondary)] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-orange-600 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    {showForm ? 'Cancelar' : 'Nuevo Cupón'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-[var(--color-surface)] p-6 rounded-2xl border border-white/5 space-y-4 animated-slide-up">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-[var(--color-text-muted)] mb-1">Código (Ej: PROMO10)</label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                className="w-full bg-[var(--color-background)] border border-white/10 p-2 rounded-lg text-white"
                                placeholder="CÓDIGO"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-[var(--color-text-muted)] mb-1">Tipo de Descuento</label>
                            <select
                                value={formData.discount_type}
                                onChange={e => setFormData({ ...formData, discount_type: e.target.value })}
                                className="w-full bg-[var(--color-background)] border border-white/10 p-2 rounded-lg text-white"
                            >
                                <option value="percentage">Porcentaje (%)</option>
                                <option value="fixed">Monto Fijo ($)</option>
                                <option value="product">Producto Gratis 🎁</option>
                            </select>
                        </div>

                        {formData.discount_type === 'product' ? (
                            <div>
                                <label className="block text-sm text-[var(--color-text-muted)] mb-1">Producto a Regalar</label>
                                <select
                                    value={formData.target_product_id}
                                    onChange={e => setFormData({ ...formData, target_product_id: e.target.value })}
                                    className="w-full bg-[var(--color-background)] border border-white/10 p-2 rounded-lg text-white"
                                >
                                    <option value="">Seleccionar producto...</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm text-[var(--color-text-muted)] mb-1">Valor</label>
                                <input
                                    type="number"
                                    value={formData.value}
                                    onChange={e => setFormData({ ...formData, value: e.target.value })}
                                    className="w-full bg-[var(--color-background)] border border-white/10 p-2 rounded-lg text-white"
                                    placeholder={formData.discount_type === 'percentage' ? 'Ej: 10' : 'Ej: 500'}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm text-[var(--color-text-muted)] mb-1">Límite de usos (Opcional)</label>
                            <input
                                type="number"
                                value={formData.usage_limit}
                                onChange={e => setFormData({ ...formData, usage_limit: e.target.value })}
                                className="w-full bg-[var(--color-background)] border border-white/10 p-2 rounded-lg text-white"
                                placeholder="Ilimitado si se deja vacío"
                            />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-lg font-bold">Crear Cupón</button>
                </form>
            )}

            <div className="grid gap-4">
                {coupons.length === 0 ? <p className="text-[var(--color-text-muted)]">No hay cupones creados.</p> :
                    coupons.map(coupon => (
                        <div key={coupon.id} className={`bg-[var(--color-surface)] p-4 rounded-xl border flex justify-between items-center ${coupon.is_active ? 'border-green-500/20' : 'border-red-500/20 opacity-75'}`}>
                            <div>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-lg font-bold text-white bg-white/10 px-2 py-1 rounded">{coupon.code}</span>
                                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${coupon.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {coupon.is_active ? 'ACTIVO' : 'INACTIVO'}
                                    </span>
                                </div>
                                <p className="text-[var(--color-text-muted)] text-sm mt-1">
                                    {coupon.discount_type === 'percentage' && `${coupon.value}% de descuento`}
                                    {coupon.discount_type === 'fixed' && `$${coupon.value} de descuento`}
                                    {coupon.discount_type === 'product' && `Regala: ${coupon.products?.name || 'Producto'}`}
                                    {coupon.usage_limit && ` • ${coupon.usage_count}/${coupon.usage_limit} usos`}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => toggleStatus(coupon.id, coupon.is_active)} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 dark:text-white" title={coupon.is_active ? "Desactivar" : "Activar"}>
                                    {coupon.is_active ? <StopCircle className="w-5 h-5 text-yellow-500" /> : <PlayCircle className="w-5 h-5 text-green-500" />}
                                </button>
                                <button onClick={() => handleDelete(coupon.id)} className="p-2 bg-red-500/10 rounded-lg hover:bg-red-500/20 text-red-500" title="Eliminar">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    )
}

export default CouponsManager
