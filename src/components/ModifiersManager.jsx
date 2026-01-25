import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Plus, Trash2, Edit2, Save, X, Layers, Scale } from 'lucide-react'
import { toast } from 'sonner'

const ModifiersManager = () => {
    const [modifiers, setModifiers] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingModifier, setEditingModifier] = useState(null)
    const [ingredients, setIngredients] = useState([])
    const [modifierRecipe, setModifierRecipe] = useState([]) // [{ ingredient_id, quantity }]

    useEffect(() => {
        fetchModifiers()
        fetchIngredients()
    }, [])

    const fetchIngredients = async () => {
        const { data } = await supabase.from('ingredients').select('*').order('name')
        if (data) setIngredients(data)
    }

    const fetchModifierRecipe = async (modifierId) => {
        const { data } = await supabase.from('modifier_recipes').select('*').eq('modifier_id', modifierId)
        if (data) setModifierRecipe(data.map(r => ({ ingredient_id: r.ingredient_id, quantity: r.quantity })))
        else setModifierRecipe([])
    }

    const fetchModifiers = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('modifiers')
            .select('*')
            .order('name', { ascending: true })

        if (data) setModifiers(data)
        setLoading(false)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        const formData = new FormData(e.target)
        const modifierData = {
            name: formData.get('name'),
            price: parseFloat(formData.get('price')),
            category: formData.get('category') || 'General',
            min_quantity: parseInt(formData.get('min_quantity')) || 0,
            max_quantity: parseInt(formData.get('max_quantity')) || 10,
            is_available: true
        }

        let modifierId = editingModifier?.id

        if (editingModifier) {
            const { error } = await supabase
                .from('modifiers')
                .update(modifierData)
                .eq('id', modifierId)

            if (!error) {
                toast.success('Extra actualizado')
                fetchModifiers()
            } else {
                toast.error('Error: ' + error.message)
                return
            }
        } else {
            const { data, error } = await supabase
                .from('modifiers')
                .insert([modifierData])
                .select()

            if (!error && data) {
                modifierId = data[0].id
                toast.success('Extra creado')
                fetchModifiers()
            } else {
                toast.error('Error: ' + error.message)
                return
            }
        }

        // SAVE RECIPE
        if (modifierId) {
            // Delete old
            if (editingModifier) {
                await supabase.from('modifier_recipes').delete().eq('modifier_id', modifierId)
            }
            // Insert new
            if (modifierRecipe.length > 0) {
                const moves = modifierRecipe.map(r => ({
                    modifier_id: modifierId,
                    ingredient_id: r.ingredient_id,
                    quantity: parseFloat(r.quantity)
                }))
                await supabase.from('modifier_recipes').insert(moves)
            }
        }
        closeModal()
    }

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar este extra?')) return

        const { error } = await supabase
            .from('modifiers')
            .delete()
            .eq('id', id)

        if (!error) {
            toast.success('Eliminado')
            setModifiers(modifiers.filter(m => m.id !== id))
        } else {
            toast.error('Error: ' + error.message)
        }
    }

    const openModal = (modifier = null) => {
        setEditingModifier(modifier)
        setModifierRecipe([])
        if (modifier) {
            fetchModifierRecipe(modifier.id)
        }
        setIsModalOpen(true)
    }

    const handleRecipeChange = (ingredientId, quantity) => {
        if (!quantity || quantity <= 0) {
            setModifierRecipe(modifierRecipe.filter(r => r.ingredient_id !== ingredientId))
            return
        }
        const existing = modifierRecipe.find(r => r.ingredient_id === ingredientId)
        if (existing) {
            setModifierRecipe(modifierRecipe.map(r => r.ingredient_id === ingredientId ? { ...r, quantity } : r))
        } else {
            setModifierRecipe([...modifierRecipe, { ingredient_id: ingredientId, quantity }])
        }
    }

    const closeModal = () => {
        setEditingModifier(null)
        setIsModalOpen(false)
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Layers className="text-[var(--color-secondary)]" />
                        Extras & Modificadores
                    </h2>
                    <p className="text-[var(--color-text-muted)] text-sm">Gestiona los adicionales disponibles (Ej: Extra Carne, Panceta)</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="bg-[var(--color-secondary)] hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Extra
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-4">
                {modifiers.map(mod => (
                    <div key={mod.id} className="bg-[var(--color-surface)] border border-white/5 rounded-xl p-4 flex justify-between items-center group hover:border-white/10 transition-colors">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg">{mod.name}</h3>
                                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded uppercase font-bold text-[var(--color-text-muted)]">
                                    {mod.category}
                                </span>
                            </div>
                            <p className="text-[var(--color-secondary)] font-bold mt-1">
                                +${mod.price.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                                Min: {mod.min_quantity || 0} / Max: {mod.max_quantity || 10}
                            </p>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => openModal(mod)}
                                className="p-2 hover:bg-blue-500/10 text-blue-400 rounded-lg transition-colors"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDelete(mod.id)}
                                className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {modifiers.length === 0 && !loading && (
                    <div className="col-span-full py-12 text-center text-[var(--color-text-muted)] border-2 border-dashed border-white/5 rounded-2xl">
                        <p>No hay extras creados aún.</p>
                        <button onClick={() => openModal()} className="text-[var(--color-secondary)] hover:underline mt-2">Crear el primero</button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeModal}>
                        <div className="bg-[var(--color-surface)] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">{editingModifier ? 'Editar Extra' : 'Nuevo Extra'}</h3>
                                <button onClick={closeModal}><X className="w-5 h-5 text-white/50 hover:text-white" /></button>
                            </div>

                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1">NOMBRE</label>
                                    <input
                                        name="name"
                                        defaultValue={editingModifier?.name}
                                        placeholder="Ej: Extra Cheddar"
                                        required
                                        className="w-full bg-[var(--color-background)] rounded-lg p-3 border border-white/5 outline-none focus:border-[var(--color-secondary)]"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1">PRECIO ($)</label>
                                        <input
                                            name="price"
                                            type="number"
                                            defaultValue={editingModifier?.price || 0}
                                            required
                                            className="w-full bg-[var(--color-background)] rounded-lg p-3 border border-white/5 outline-none focus:border-[var(--color-secondary)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1">CATEGORÍA</label>
                                        <select
                                            name="category"
                                            defaultValue={editingModifier?.category || 'General'}
                                            className="w-full bg-[var(--color-background)] rounded-lg p-3 border border-white/5 outline-none focus:border-[var(--color-secondary)] text-white"
                                        >
                                            <option value="General">General</option>
                                            <option value="Carne">Carne</option>
                                            <option value="Queso">Queso</option>
                                            <option value="Salsas">Salsas</option>
                                            <option value="Veggie">Veggie</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1">MÍNIMO (Opcional)</label>
                                        <input
                                            name="min_quantity"
                                            type="number"
                                            min="0"
                                            defaultValue={editingModifier?.min_quantity || 0}
                                            className="w-full bg-[var(--color-background)] rounded-lg p-3 border border-white/5 outline-none focus:border-[var(--color-secondary)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1">MÁXIMO</label>
                                        <input
                                            name="max_quantity"
                                            type="number"
                                            min="1"
                                            defaultValue={editingModifier?.max_quantity || 10}
                                            required
                                            className="w-full bg-[var(--color-background)] rounded-lg p-3 border border-white/5 outline-none focus:border-[var(--color-secondary)]"
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-[var(--color-surface)] rounded-xl border border-white/5 space-y-4">
                                    <h5 className="font-bold text-sm text-[var(--color-primary)] flex items-center gap-2">
                                        <Scale className="w-4 h-4" /> Receta / Consumo Stock
                                    </h5>
                                    <p className="text-xs text-[var(--color-text-muted)]">Define qué ingredientes descuenta este extra.</p>

                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar p-2">
                                        {ingredients.map(ing => {
                                            const current = modifierRecipe.find(r => r.ingredient_id === ing.id)
                                            return (
                                                <div key={ing.id} className={`flex items-center justify-between p-2 rounded-lg border ${current ? 'bg-green-500/10 border-green-500/30' : 'bg-black/20 border-white/5'}`}>
                                                    <div className="flex-1">
                                                        <span className="font-bold text-sm">{ing.name}</span>
                                                        <span className="text-xs text-[var(--color-text-muted)] ml-1">({ing.unit})</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        placeholder="0"
                                                        value={current?.quantity || ''}
                                                        onChange={(e) => handleRecipeChange(ing.id, parseFloat(e.target.value))}
                                                        className={`w-20 text-center bg-[var(--color-background)] rounded border p-1 outline-none text-sm font-bold ${current ? 'text-green-400 border-green-500' : 'text-gray-500 border-white/10'}`}
                                                    />
                                                </div>
                                            )
                                        })}
                                        {ingredients.length === 0 && <span className="text-xs text-yellow-500">Primero crea ingredientes en "Inventario"</span>}
                                    </div>
                                </div>

                                <button type="submit" className="w-full bg-[var(--color-secondary)] hover:bg-orange-600 text-white font-bold py-3 rounded-lg mt-4 transition-colors">
                                    Guardar
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    )
}

export default ModifiersManager
