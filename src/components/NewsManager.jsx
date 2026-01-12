import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Plus, Trash2, Image, Type, Link as LinkIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const NewsManager = () => {
    const [news, setNews] = useState([])
    const [loading, setLoading] = useState(true)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        image_url: '',
        type: 'Novedad',
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

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar esta noticia?')) return

        const { error } = await supabase.from('news_events').delete().eq('id', id)
        if (!error) {
            setNews(news.filter(n => n.id !== id))
            toast.success('Noticia eliminada')
        } else {
            toast.error('Error al eliminar: ' + error.message)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)

        const { data, error } = await supabase.from('news_events').insert([formData]).select()

        if (!error && data) {
            setNews([data[0], ...news])
            setFormData({
                title: '',
                description: '',
                image_url: '',
                action_text: 'Ver más'
            })
            toast.success('Noticia publicada')
        } else {
            toast.error('Error al crear: ' + (error?.message || 'Unknown error'))
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
                    Nueva Noticia / Promo
                </h3>
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
                        <label className="block text-xs uppercase text-[var(--color-text-muted)] mb-1">URL Imagen</label>
                        <div className="flex bg-[var(--color-background)] rounded-lg border border-[var(--color-primary)]/30 overflow-hidden focus-within:ring-1 ring-[var(--color-secondary)]">
                            <span className="p-3 text-[var(--color-text-muted)]"><Image className="w-4 h-4" /></span>
                            <input name="image_url" value={formData.image_url} onChange={handleChange} className="bg-transparent w-full p-2 outline-none" placeholder="https://..." />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs uppercase text-[var(--color-text-muted)] mb-1">Tipo & Botón</label>
                        <div className="flex gap-2">
                            <select name="type" value={formData.type} onChange={handleChange} className="bg-[var(--color-background)] rounded-lg border border-[var(--color-primary)]/30 p-2 outline-none text-sm flex-1">
                                <option>Novedad</option>
                                <option>Promo</option>
                                <option>Evento</option>
                            </select>
                            <input name="action_text" value={formData.action_text} onChange={handleChange} className="bg-[var(--color-background)] rounded-lg border border-[var(--color-primary)]/30 p-2 outline-none text-sm flex-1" placeholder="Texto Botón" />
                        </div>
                    </div>

                    <div className="md:col-span-2 pt-2">
                        <button type="submit" disabled={submitting} className="bg-[var(--color-secondary)] text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors w-full md:w-auto flex justify-center items-center gap-2">
                            {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : 'Publicar Noticia'}
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
                            <div key={item.id} className="bg-[var(--color-surface)] rounded-xl overflow-hidden border border-white/5 flex flex-col">
                                <div className="h-32 bg-[var(--color-background)] relative">
                                    {item.image_url ? <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-2xl">📰</div>}
                                    <span className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">{item.type}</span>
                                </div>
                                <div className="p-4 flex-1">
                                    <h4 className="font-bold leading-tight mb-2">{item.title}</h4>
                                    <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">{item.description}</p>
                                </div>
                                <div className="p-4 border-t border-white/5 flex justify-between items-center">
                                    <span className="text-[10px] text-[var(--color-text-muted)]">{new Date(item.created_at).toLocaleDateString()}</span>
                                    <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-400 p-1">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {news.length === 0 && <p className="text-[var(--color-text-muted)] col-span-full">No hay noticias publicadas.</p>}
                    </div>
                )}
            </div>
        </div>
    )
}

export default NewsManager
