import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Plus, Trash2, Image, Type, Link as LinkIcon, Loader2, Video, Edit, X } from 'lucide-react'
import { toast } from 'sonner'

const NewsManager = () => {
    const [news, setNews] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState(null)

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        image_url: '',
        type: 'Novedad',
        media_type: 'image', // 'image' or 'video'
        action_text: 'Ver más'
    })
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchNews()
    }, [])

    const fetchNews = async () => {
        setLoading(true)
        const { data } = await supabase.from('news_events').select('*').order('created_at', { ascending: false })
        if (data) setNews(data)
        setLoading(false)
    }

    const handleDelete = (id) => {
        toast.info('¿Eliminar esta noticia?', {
            description: 'Esta acción no se puede deshacer.',
            action: {
                label: 'Eliminar',
                onClick: async () => {
                    const { error } = await supabase.from('news_events').delete().eq('id', id)
                    if (!error) {
                        setNews(news.filter(n => n.id !== id))
                        toast.success('Noticia eliminada')
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
            title: item.title,
            description: item.description || '',
            image_url: item.image_url || '',
            type: item.type || 'Novedad',
            media_type: item.media_type || 'image',
            action_text: item.action_text || 'Ver más'
        })
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const cancelEdit = () => {
        setEditingId(null)
        setFormData({
            title: '',
            description: '',
            image_url: '',
            type: 'Novedad',
            media_type: 'image',
            action_text: 'Ver más'
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)

        if (editingId) {
            // Update existing
            const { data, error } = await supabase
                .from('news_events')
                .update(formData)
                .eq('id', editingId)
                .select()

            if (!error && data) {
                setNews(news.map(n => n.id === editingId ? data[0] : n))
                toast.success('Noticia actualizada')
                cancelEdit()
            } else {
                toast.error('Error al actualizar: ' + (error?.message || 'Error desconocido'))
            }
        } else {
            // Create new
            const { data, error } = await supabase.from('news_events').insert([formData]).select()

            if (!error && data) {
                setNews([data[0], ...news])
                toast.success('Noticia publicada')
                cancelEdit()
            } else {
                toast.error('Error al crear: ' + (error?.message || 'Error desconocido'))
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
                        {editingId ? 'Editar Noticia / Promo' : 'Nueva Noticia / Promo'}
                    </h3>
                    {editingId && (
                        <button onClick={cancelEdit} className="text-xs flex items-center gap-1 text-[var(--color-text-muted)] hover:text-white bg-white/5 px-2 py-1 rounded">
                            <X className="w-3 h-3" /> Cancelar Edición
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs uppercase text-[var(--color-text-muted)] mb-1">Título</label>
                        <div className="flex bg-[var(--color-background)] rounded-lg border border-[var(--color-primary)]/30 overflow-hidden focus-within:ring-1 ring-[var(--color-secondary)]">
                            <span className="p-3 text-[var(--color-text-muted)]"><Type className="w-4 h-4" /></span>
                            <input name="title" value={formData.title} onChange={handleChange} required className="bg-transparent w-full p-2 outline-none" placeholder="Ej: 2x1 en Clásicas" />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs uppercase text-[var(--color-text-muted)] mb-1">Descripción</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows="3" className="w-full bg-[var(--color-background)] rounded-lg border border-[var(--color-primary)]/30 p-3 outline-none focus:ring-1 ring-[var(--color-secondary)]" placeholder="Detalles de la promo..." />
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
                            <select name="type" value={formData.type} onChange={handleChange} className="bg-[var(--color-background)] rounded-lg border border-[var(--color-primary)]/30 p-2 outline-none text-sm flex-1">
                                <option>Novedad</option>
                                <option>Promo</option>
                                <option>Evento</option>
                            </select>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs uppercase text-[var(--color-text-muted)] mb-1">Texto del Botón</label>
                        <input name="action_text" value={formData.action_text} onChange={handleChange} className="w-full bg-[var(--color-background)] rounded-lg border border-[var(--color-primary)]/30 p-2 outline-none text-sm" placeholder="Ej: Ver más" />
                    </div>

                    <div className="md:col-span-2 pt-2">
                        <button type="submit" disabled={submitting} className={`w-full md:w-auto flex justify-center items-center gap-2 px-6 py-2 rounded-lg font-bold transition-colors ${editingId ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-[var(--color-secondary)] hover:bg-orange-600 text-white'}`}>
                            {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : editingId ? 'Actualizar Noticia' : 'Publicar Noticia'}
                        </button>
                    </div>
                </form>
            </div>

            {/* List */}
            <div>
                <h3 className="text-lg font-bold mb-4">Noticias Activas</h3>
                {loading ? <p>Cargando...</p> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {news.map(item => (
                            <div key={item.id} className={`bg-[var(--color-surface)] rounded-xl overflow-hidden border flex flex-col ${editingId === item.id ? 'border-blue-500/50 ring-1 ring-blue-500/50' : 'border-white/5'}`}>
                                <div className="h-32 bg-[var(--color-background)] relative group">
                                    {item.media_type === 'video' ? (
                                        <video src={item.image_url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                                    ) : (
                                        item.image_url ? <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-2xl">📰</div>
                                    )}
                                    <span className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm shadow-sm">{item.type}</span>
                                    {item.media_type === 'video' && <span className="absolute bottom-2 right-2 bg-black/50 text-white p-1 rounded-full"><Video className="w-3 h-3" /></span>}
                                </div>
                                <div className="p-4 flex-1">
                                    <h4 className="font-bold leading-tight mb-2">{item.title}</h4>
                                    <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">{item.description}</p>
                                </div>
                                <div className="p-4 border-t border-white/5 flex justify-between items-center bg-[var(--color-background)]/30">
                                    <span className="text-[10px] text-[var(--color-text-muted)]">{new Date(item.created_at).toLocaleDateString()}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit(item)} className="text-blue-400 hover:text-blue-300 p-1 hover:bg-blue-400/10 rounded" title="Editar">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-400 p-1 hover:bg-red-500/10 rounded" title="Eliminar">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {news.length === 0 && <p className="text-[var(--color-text-muted)] col-span-full py-10 text-center">No hay noticias publicadas.</p>}
                    </div>
                )}
            </div>
        </div>
    )
}

export default NewsManager
