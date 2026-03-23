import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { Plus, Trash2, Edit2, Save, X, AlertTriangle, Package, History } from 'lucide-react'
import { toast } from 'sonner'
import { useTenant } from '../../context/TenantContext'

const IngredientManager = () => {
    const { tenantId } = useTenant()
    const [ingredients, setIngredients] = useState([])
    const [loading, setLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [showStockModal, setShowStockModal] = useState(false)
    const [selectedIngredient, setSelectedIngredient] = useState(null)
    const [stockAdjustment, setStockAdjustment] = useState('')

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        unit: 'g', // g, kg, ml, l, u
        stock: 0,
        min_stock: 100
    })

    useEffect(() => {
        fetchIngredients()
    }, [])

    const fetchIngredients = async () => {
        try {
            const { data, error } = await supabase
                .from('ingredients')
                .select('*')
                .order('name', { ascending: true })

            if (error) throw error
            setIngredients(data)
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error al cargar ingredientes')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!formData.name) return toast.error('Nombre requerido')

        try {
            const payload = {
                name: formData.name,
                unit: formData.unit,
                stock: parseFloat(formData.stock),
                min_stock: parseFloat(formData.min_stock),
                tenant_id: tenantId
            }

            if (editingId) {
                const { error } = await supabase.from('ingredients').update(payload).eq('id', editingId)
                if (error) throw error
                toast.success('Ingrediente actualizado')
            } else {
                const { error } = await supabase.from('ingredients').insert([payload])
                if (error) throw error
                toast.success('Ingrediente creado')
            }

            resetForm()
            fetchIngredients()

        } catch (error) {
            console.error(error)
            toast.error('Error al guardar')
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar ingrediente? Si está en uso en recetas, esto podría causar problemas.')) return

        try {
            const { error } = await supabase.from('ingredients').delete().eq('id', id)
            if (error) throw error
            setIngredients(ingredients.filter(i => i.id !== id))
            toast.success('Ingrediente eliminado')
        } catch (error) {
            toast.error('Error al eliminar')
        }
    }

    const handleAddStock = async () => {
        if (!selectedIngredient || !stockAdjustment) return

        const amount = parseFloat(stockAdjustment)
        if (isNaN(amount) || amount <= 0) return toast.error('Cantidad inválida')

        try {
            // Optimistic update
            const newStock = selectedIngredient.stock + amount

            const { error } = await supabase
                .from('ingredients')
                .update({ stock: newStock })
                .eq('id', selectedIngredient.id)

            if (error) throw error

            toast.success(`Stock actualizado: +${amount}${selectedIngredient.unit}`)
            fetchIngredients()
            setShowStockModal(false)
            setStockAdjustment('')
            setSelectedIngredient(null)

        } catch (error) {
            toast.error('Error al actualizar stock')
        }
    }

    const resetForm = () => {
        setFormData({ name: '', unit: 'g', stock: 0, min_stock: 100 })
        setIsCreating(false)
        setEditingId(null)
    }

    const startEdit = (ing) => {
        setFormData(ing)
        setEditingId(ing.id)
        setIsCreating(true)
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Package className="text-[var(--color-primary)]" />
                        Materia Prima
                    </h2>
                    <p className="text-[var(--color-text-muted)] text-sm">Gestiona el stock de tus ingredientes base.</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsCreating(true) }}
                    className="bg-[var(--color-secondary)] hover:bg-orange-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition-all shadow-lg shadow-orange-900/20"
                >
                    <Plus size={18} /> Nuevo Ingrediente
                </button>
            </div>

            {/* Main List */}
            <div className="bg-[var(--color-surface)] rounded-xl border border-white/10 overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[var(--color-background)]/50 text-[var(--color-text-muted)] uppercase text-xs">
                        <tr>
                            <th className="p-4">Ingrediente</th>
                            <th className="p-4 text-center">Unidad</th>
                            <th className="p-4 text-center">Stock Actual</th>
                            <th className="p-4 text-center">Alerta Min.</th>
                            <th className="p-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">


                        {ingredients.map(ing => {
                            const isLow = ing.stock <= ing.min_stock;
                            return (
                                <tr key={ing.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-4 font-medium flex items-center gap-2">
                                        {ing.name}
                                        {isLow && <AlertTriangle className="w-4 h-4 text-yellow-500 animate-pulse" />}
                                    </td>
                                    <td className="p-4 text-center text-[var(--color-text-muted)] text-sm">{ing.unit}</td>
                                    <td className="p-4 text-center">
                                        <span className={`font-bold px-3 py-1 rounded-full ${isLow ? 'bg-red-500/20 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                            {ing.stock} {ing.unit}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center text-[var(--color-text-muted)] text-sm">{ing.min_stock} {ing.unit}</td>
                                    <td className="p-4 text-right flex justify-end items-center gap-2">
                                        <button
                                            onClick={() => { setSelectedIngredient(ing); setShowStockModal(true) }}
                                            className="px-3 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white rounded text-xs font-bold transition-all flex items-center gap-1"
                                        >
                                            <Plus size={12} /> REPOSICIÓN
                                        </button>
                                        <div className="w-px h-4 bg-white/10 mx-1"></div>
                                        <button onClick={() => startEdit(ing)} className="text-[var(--color-text-muted)] hover:text-white p-1"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDelete(ing.id)} className="text-[var(--color-text-muted)] hover:text-red-500 p-1"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                {ingredients.length === 0 && !isCreating && (
                    <div className="p-8 text-center text-[var(--color-text-muted)]">
                        No hay materias primas registradas.
                    </div>
                )}
            </div>

            {/* Quick Stock Modal */}
            {showStockModal && selectedIngredient && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--color-surface)] border border-white/10 rounded-xl p-6 w-full max-w-sm animate-in zoom-in-95">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Plus className="text-green-500" />
                            Ingreso de Mercadería
                        </h3>
                        <p className="text-sm text-[var(--color-text-muted)] mb-4">
                            Agregando stock a <span className="text-white font-bold">{selectedIngredient.name}</span>.
                            <br />Unidad: {selectedIngredient.unit}
                        </p>

                        <input
                            type="number"
                            autoFocus
                            placeholder={`Cantidad (${selectedIngredient.unit})`}
                            value={stockAdjustment}
                            onChange={(e) => setStockAdjustment(e.target.value)}
                            className="w-full bg-[var(--color-background)] border border-white/20 rounded-lg p-3 mb-4 text-lg font-bold outline-none focus:border-green-500"
                        />

                        <div className="flex gap-2">
                            <button
                                onClick={handleAddStock}
                                className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-bold transition-colors"
                            >
                                Confirmar Ingreso
                            </button>
                            <button
                                onClick={() => setShowStockModal(false)}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-lg font-bold transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Ingredient Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--color-surface)] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                {editingId ? <Edit2 className="w-5 h-5 text-[var(--color-primary)]" /> : <Plus className="w-5 h-5 text-[var(--color-secondary)]" />}
                                {editingId ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
                            </h3>
                            <button onClick={resetForm} className="text-white/50 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1">Nombre</label>
                                <input
                                    autoFocus
                                    placeholder="Ej: Bacon, Pan, Cheddar..."
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1">Unidad de Medida</label>
                                <select
                                    value={formData.unit}
                                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                    className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[var(--color-primary)] appearance-none"
                                >
                                    <option value="g">Gramos (g)</option>
                                    <option value="kg">Kilos (kg)</option>
                                    <option value="ml">Mililitros (ml)</option>
                                    <option value="l">Litros (l)</option>
                                    <option value="u">Unidades (u)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1">Stock Actual</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={formData.stock}
                                        onChange={e => setFormData({ ...formData, stock: e.target.value })}
                                        className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1">Alerta Mínima</label>
                                    <input
                                        type="number"
                                        placeholder="100"
                                        value={formData.min_stock}
                                        onChange={e => setFormData({ ...formData, min_stock: e.target.value })}
                                        className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t border-white/5">
                                <button
                                    onClick={resetForm}
                                    className="flex-1 py-3 rounded-xl font-bold text-[var(--color-text-muted)] hover:bg-white/5 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-1 bg-[var(--color-primary)] hover:opacity-90 text-white py-3 rounded-xl font-bold shadow-lg shadow-purple-900/20 transition-all"
                                >
                                    {editingId ? 'Guardar Cambios' : 'Crear Ingrediente'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default IngredientManager
