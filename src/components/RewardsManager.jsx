import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Plus, Trash2, Image, Type, Loader2, Star } from 'lucide-react'

const RewardsManager = () => {
    const [rewards, setRewards] = useState([])
    const [loading, setLoading] = useState(true)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        image_url: '',
        cost: 100
    })
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchRewards()
    }, [])

    const fetchRewards = async () => {
        setLoading(true)
        const { data } = await supabase.from('rewards').select('*').order('cost', { ascending: true })
        if (data) setRewards(data)
        setLoading(false)
    }

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este premio?')) return

        const { error } = await supabase.from('rewards').delete().eq('id', id)
        if (!error) {
            setRewards(rewards.filter(r => r.id !== id))
        } else {
            alert('Error al eliminar: ' + error.message)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)

        const { data, error } = await supabase.from('rewards').insert([formData]).select()

        if (!error && data) {
            setRewards([...rewards, data[0]].sort((a, b) => a.cost - b.cost))
            setFormData({
                name: '',
                description: '',
                image_url: '',
                cost: 100
            })
        } else {
            alert('Error al crear: ' + (error?.message || 'Unknown error'))
        }
        setSubmitting(false)
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    return (
        <div className="space-y-8">
            {/* Create Form */}
            <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-white/5">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-[var(--color-secondary)]" />
                    Nuevo Premio / Canje
                </h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs uppercase text-[var(--color-text-muted)] mb-1">Nombre del Premio</label>
                        <div className="flex bg-[var(--color-background)] rounded-lg border border-[var(--color-primary)]/30 overflow-hidden focus-within:ring-1 ring-[var(--color-secondary)]">
                            <span className="p-3 text-[var(--color-text-muted)]"><Type className="w-4 h-4" /></span>
                            <input name="name" value={formData.name} onChange={handleChange} required className="bg-transparent w-full p-2 outline-none" placeholder="Ej: Combo Whopper Jr." />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs uppercase text-[var(--color-text-muted)] mb-1">Descripción</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows="2" className="w-full bg-[var(--color-background)] rounded-lg border border-[var(--color-primary)]/30 p-3 outline-none focus:ring-1 ring-[var(--color-secondary)]" placeholder="Detalles del premio..." />
                    </div>

                    <div>
                        <label className="block text-xs uppercase text-[var(--color-text-muted)] mb-1">URL Imagen</label>
                        <div className="flex bg-[var(--color-background)] rounded-lg border border-[var(--color-primary)]/30 overflow-hidden focus-within:ring-1 ring-[var(--color-secondary)]">
                            <span className="p-3 text-[var(--color-text-muted)]"><Image className="w-4 h-4" /></span>
                            <input name="image_url" value={formData.image_url} onChange={handleChange} className="bg-transparent w-full p-2 outline-none" placeholder="https://..." />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs uppercase text-[var(--color-text-muted)] mb-1">Costo (Estrellas)</label>
                        <div className="flex bg-[var(--color-background)] rounded-lg border border-[var(--color-primary)]/30 overflow-hidden focus-within:ring-1 ring-[var(--color-secondary)]">
                            <span className="p-3 text-[var(--color-text-muted)]"><Star className="w-4 h-4" /></span>
                            <input type="number" name="cost" value={formData.cost} onChange={handleChange} className="bg-transparent w-full p-2 outline-none" placeholder="100" />
                        </div>
                    </div>

                    <div className="md:col-span-2 pt-2">
                        <button type="submit" disabled={submitting} className="bg-[var(--color-secondary)] text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors w-full md:w-auto flex justify-center items-center gap-2">
                            {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : 'Guardar Premio'}
                        </button>
                    </div>
                </form>
            </div>

            {/* List */}
            <div>
                <h3 className="text-lg font-bold mb-4">Premios Activos</h3>
                {loading ? <p>Cargando...</p> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rewards.map(item => (
                            <div key={item.id} className="bg-[var(--color-surface)] rounded-xl overflow-hidden border border-white/5 flex flex-col group hover:border-[var(--color-secondary)] transition-colors">
                                <div className="h-40 bg-[var(--color-background)] relative">
                                    {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-4xl">🎁</div>}
                                    <div className="absolute top-2 right-2 bg-[var(--color-secondary)] text-white text-xs font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-white" /> {item.cost}
                                    </div>
                                </div>
                                <div className="p-4 flex-1">
                                    <h4 className="font-bold leading-tight mb-1">{item.name}</h4>
                                    <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">{item.description}</p>
                                </div>
                                <div className="p-4 border-t border-white/5 flex justify-end">
                                    <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-400 p-2 hover:bg-white/5 rounded-full transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {rewards.length === 0 && <p className="text-[var(--color-text-muted)] col-span-full">No hay premios creados.</p>}
                    </div>
                )}
            </div>
        </div>
    )
}

export default RewardsManager
