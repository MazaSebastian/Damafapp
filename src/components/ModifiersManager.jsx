import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Plus, Trash2, Edit2, Save, X, Layers } from 'lucide-react'
import { toast } from 'sonner'

const ModifiersManager = () => {
    const [modifiers, setModifiers] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingModifier, setEditingModifier] = useState(null)

    useEffect(() => {
        fetchModifiers()
    }, [])

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

        if (editingModifier) {
            const { error } = await supabase
                .from('modifiers')
                .update(modifierData)
                .eq('id', editingModifier.id)

            if (!error) {
                toast.success('Extra actualizado')
                fetchModifiers()
                closeModal()
            } else {
                toast.error('Error: ' + error.message)
            }
        } else {
            const { error } = await supabase
                .from('modifiers')
                .insert([modifierData])

            if (!error) {
                toast.success('Extra creado')
                fetchModifiers()
                closeModal()
            } else {
                toast.error('Error: ' + error.message)
            }
        }
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
        setIsModalOpen(true)
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
