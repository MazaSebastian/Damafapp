import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Plus, Trash2, Image, Type, Loader2, Star, Video, Edit, X } from 'lucide-react'
import { toast } from 'sonner'

const RewardsManager = () => {
    const [rewards, setRewards] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState(null)

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        image_url: '',
        cost: 100,
        media_type: 'image' // 'image' or 'video'
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

    const handleDelete = (id) => {
        toast.info('¿Eliminar este premio?', {
            description: 'Esta acción no se puede deshacer.',
            action: {
                label: 'Eliminar',
                onClick: async () => {
                    const { error } = await supabase.from('rewards').delete().eq('id', id)
                    if (!error) {
                        setRewards(rewards.filter(r => r.id !== id))
                        toast.success('Premio eliminado')
                    } else {
                        toast.error('Error al eliminar: ' + error.message)
                    }
                }
            },
            cancel: { label: 'Cancelar' }
        })
    }

    const handleEdit = (item) => {
        setEditingId(item.id)
        setFormData({
            name: item.name,
            description: item.description || '',
            image_url: item.image_url || '',
            cost: item.cost || 100,
            media_type: item.media_type || 'image'
        })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const cancelEdit = () => {
        setEditingId(null)
        setFormData({
            name: '',
            description: '',
            image_url: '',
            cost: 100,
            media_type: 'image'
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)

        if (editingId) {
            // Update
            const { data, error } = await supabase
                .from('rewards')
                .update(formData)
                .eq('id', editingId)
                .select()

            if (!error && data) {
                setRewards(rewards.map(r => r.id === editingId ? data[0] : r).sort((a, b) => a.cost - b.cost))
                toast.success('Premio actualizado')
                cancelEdit()
            } else {
                toast.error('Error al actualizar: ' + (error?.message || 'Error desconocido'))
            }
        } else {
            // Create
            const { data, error } = await supabase.from('rewards').insert([formData]).select()

            if (!error && data) {
                setRewards([...rewards, data[0]].sort((a, b) => a.cost - b.cost))
                toast.success('Premio creado')
                cancelEdit()
            } else {
                toast.error('Error al crear: ' + (error?.message || 'Unknown error'))
            }
        }
        setSubmitting(false)
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    return (
        <div className="space-y-8">
            {/* Form */}
            <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        {editingId ? <Edit className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5 text-[var(--color-secondary)]" />}
                        {editingId ? 'Editar Premio / Canje' : 'Nuevo Premio / Canje'}
                    </h3>
                    {editingId && (
                        <button onClick={cancelEdit} className="text-xs flex items-center gap-1 text-[var(--color-text-muted)] hover:text-white bg-white/5 px-2 py-1 rounded">
                            <X className="w-3 h-3" /> Cancelar Edición
                        </button>
                    )}
                </div>

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
                        <label className="block text-xs uppercase text-[var(--color-text-muted)] mb-1">URL Media (Imagen/Video)</label>
                        <div className="flex bg-[var(--color-background)] rounded-lg border border-[var(--color-primary)]/30 overflow-hidden focus-within:ring-1 ring-[var(--color-secondary)]">
                            <span className="p-3 text-[var(--color-text-muted)]">
                                {formData.media_type === 'video' ? <Video className="w-4 h-4" /> : <Image className="w-4 h-4" />}
                            </span>
                            <input name="image_url" value={formData.image_url} onChange={handleChange} className="bg-transparent w-full p-2 outline-none" placeholder="https://..." />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs uppercase text-[var(--color-text-muted)] mb-1">Configuración</label>
                        <div className="flex gap-2">
                            <select name="media_type" value={formData.media_type} onChange={handleChange} className="bg-[var(--color-background)] rounded-lg border border-[var(--color-primary)]/30 p-2 outline-none text-sm w-24">
                                <option value="image">Imagen</option>
                                <option value="video">Video</option>
                            </select>
                            <div className="flex bg-[var(--color-background)] rounded-lg border border-[var(--color-primary)]/30 overflow-hidden focus-within:ring-1 ring-[var(--color-secondary)] flex-1">
                                <span className="p-2 text-[var(--color-text-muted)]"><Star className="w-4 h-4" /></span>
                                <input type="number" name="cost" value={formData.cost} onChange={handleChange} className="bg-transparent w-full p-2 outline-none" placeholder="100" />
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 pt-2">
                        <button type="submit" disabled={submitting} className={`w-full md:w-auto flex justify-center items-center gap-2 px-6 py-2 rounded-lg font-bold transition-colors ${editingId ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-[var(--color-secondary)] hover:bg-orange-600 text-white'}`}>
                            {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : editingId ? 'Actualizar Premio' : 'Guardar Premio'}
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
                            <div key={item.id} className={`bg-[var(--color-surface)] rounded-xl overflow-hidden border flex flex-col group hover:border-[var(--color-secondary)] transition-colors ${editingId === item.id ? 'border-blue-500/50 ring-1 ring-blue-500/50' : 'border-white/5'}`}>
                                <div className="h-40 bg-[var(--color-background)] relative">
                                    {item.media_type === 'video' ? (
                                        <video src={item.image_url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                                    ) : (
                                        item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-4xl">🎁</div>
                                    )}
                                    <div className="absolute top-2 right-2 bg-[var(--color-secondary)] text-white text-xs font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-white" /> {item.cost}
                                    </div>
                                    {item.media_type === 'video' && <span className="absolute bottom-2 left-2 bg-black/50 text-white p-1 rounded-full"><Video className="w-3 h-3" /></span>}
                                </div>
                                <div className="p-4 flex-1">
                                    <h4 className="font-bold leading-tight mb-1">{item.name}</h4>
                                    <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">{item.description}</p>
                                </div>
                                <div className="p-4 border-t border-white/5 flex justify-end gap-2 bg-[var(--color-background)]/30">
                                    <button onClick={() => handleEdit(item)} className="text-blue-400 hover:text-blue-300 p-2 hover:bg-blue-400/10 rounded-full transition-colors" title="Editar">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-full transition-colors" title="Eliminar">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {rewards.length === 0 && <p className="text-[var(--color-text-muted)] col-span-full py-10 text-center">No hay premios creados.</p>}
                    </div>
                )}
            </div>
        </div>
    )
}

export default RewardsManager
