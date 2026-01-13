import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Plus, Trash2, Edit2, Save, X, ChevronRight, Loader2, Image, List } from 'lucide-react'
import { toast } from 'sonner'

const ProductManager = () => {
    const [categories, setCategories] = useState([])
    const [selectedCategory, setSelectedCategory] = useState(null)
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState('list') // 'list', 'edit-cat', 'edit-prod'

    const [stats, setStats] = useState({})

    useEffect(() => {
        fetchCategories()
        updateStats()
    }, [])

    useEffect(() => {
        if (selectedCategory) {
            fetchProducts(selectedCategory.id)
        }
    }, [selectedCategory])

    const updateStats = async () => {
        const { data } = await supabase.from('products').select('category_id').eq('is_available', true)
        if (data) {
            const counts = {}
            data.forEach(p => {
                counts[p.category_id] = (counts[p.category_id] || 0) + 1
            })
            setStats(counts)
        }
    }

    const fetchCategories = async () => {
        setLoading(true)
        const { data } = await supabase.from('categories').select('*').order('sort_order', { ascending: true })
        if (data) setCategories(data)
        setLoading(false)
    }

    const fetchProducts = async (catId) => {
        setLoading(true)
        const { data } = await supabase.from('products').select('*').eq('category_id', catId).eq('is_available', true)
        if (data) setProducts(data)
        setLoading(false)
    }

    const [isModalOpen, setIsModalOpen] = useState(false)

    // --- Product Handlers ---
    const handleSaveProduct = async (e) => {
        e.preventDefault()
        const formData = new FormData(e.target)
        const productData = {
            category_id: selectedCategory.id,
            name: formData.get('name'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price')),
            image_url: formData.get('image_url'),
            media_type: formData.get('media_type') || 'image',
            is_available: true
        }

        if (editingProduct) {
            // Update existing product
            const { error } = await supabase
                .from('products')
                .update(productData)
                .eq('id', editingProduct.id)

            if (!error) {
                setProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...productData } : p))
                setEditingProduct(null)
                setIsModalOpen(false)
                toast.success('Producto actualizado')
            } else {
                toast.error('Error al actualizar: ' + error.message)
            }
        } else {
            // Create new product
            const { data, error } = await supabase.from('products').insert([productData]).select()
            if (!error && data) {
                setProducts([...products, data[0]])
                updateStats()
                // e.target.reset() // Not needed as modal closes
                setIsModalOpen(false)
                toast.success('Producto creado correctamente')
            } else {
                toast.error('Error creating product: ' + error?.message)
            }
        }
    }

    const startEditing = (product) => {
        setEditingProduct(product)
        setIsModalOpen(true)
    }

    const startCreating = () => {
        setEditingProduct(null)
        setIsModalOpen(true)
    }

    const cancelEditing = () => {
        setEditingProduct(null)
        setIsModalOpen(false)
    }

    const handleDeleteProduct = async (id) => {
        if (!confirm('¿Archivar producto? (Esto lo ocultará del menú pero guardará el historial)')) return
        const { error } = await supabase.from('products').update({ is_available: false }).eq('id', id)
        if (!error) {
            setProducts(products.filter(p => p.id !== id))
            updateStats()
            toast.success('Producto archivado')
        } else {
            toast.error('Error al archivar: ' + error.message)
        }
    }

    // --- Category Handlers ---
    const handleAddCategory = async (e) => {
        e.preventDefault()
        const formData = new FormData(e.target)
        const newCat = {
            name: formData.get('name'),
            slug: formData.get('name').toLowerCase().replace(/\s+/g, '-'),
            sort_order: categories.length + 1
        }
        const { data, error } = await supabase.from('categories').insert([newCat]).select()
        if (!error && data) {
            setCategories([...categories, data[0]])
            e.target.reset()
        }
    }

    const handleDeleteCategory = async (id) => {
        if (!confirm('Eliminar categoría y sus productos?')) return
        const { error } = await supabase.from('categories').delete().eq('id', id)
        if (!error) {
            setCategories(categories.filter(c => c.id !== id))
            if (selectedCategory?.id === id) setSelectedCategory(null)
            updateStats()
            toast.success('Categoría eliminada')
        } else {
            toast.error('Error al eliminar: ' + error.message)
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-150px)]">
            {/* Categories Sidebar */}
            <div className="lg:col-span-1 bg-[var(--color-surface)] rounded-2xl border border-white/5 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-white/5 bg-[var(--color-background)]/50">
                    <h3 className="font-bold flex items-center gap-2">
                        <List className="w-4 h-4 text-[var(--color-secondary)]" /> Categorías
                    </h3>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {categories.map(cat => (
                        <div
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat)}
                            className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group transition-colors ${selectedCategory?.id === cat.id ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-white/5'}`}
                        >
                            <span className="font-medium">{cat.name}</span>
                            <div className="flex items-center gap-2">
                                {(stats[cat.id] || 0) > 0 && (
                                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-bold">
                                        {stats[cat.id]}
                                    </span>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id) }} className="hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Add Category Form */}
                    <form onSubmit={handleAddCategory} className="mt-4 p-2 bg-white/5 rounded-xl border border-dashed border-white/10">
                        <input name="name" placeholder="Nueva Categoría..." className="bg-transparent w-full text-sm outline-none mb-2 text-white" required />
                        <button type="submit" className="w-full bg-[var(--color-secondary)]/20 text-[var(--color-secondary)] hover:bg-[var(--color-secondary)] hover:text-white text-xs font-bold py-1.5 rounded-lg transition-colors">
                            + Agregar
                        </button>
                    </form>
                </div>
            </div>

            {/* Products Main Area */}
            <div className="lg:col-span-2 bg-[var(--color-surface)] rounded-2xl border border-white/5 flex flex-col overflow-hidden relative">
                {selectedCategory ? (
                    <>
                        <div className="p-4 border-b border-white/5 bg-[var(--color-background)]/50 flex justify-between items-center">
                            <h3 className="font-bold text-lg">{selectedCategory.name} <span className="text-[var(--color-text-muted)] text-sm font-normal">({products.length} productos)</span></h3>
                            <button
                                onClick={startCreating}
                                className="bg-[var(--color-secondary)] hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Nuevo Producto
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {/* Product List */}
                            <div className="space-y-3 mb-6">
                                {products.map(prod => (
                                    <div key={prod.id} className={`bg-[var(--color-background)] rounded-xl p-3 flex gap-4 items-center border border-white/5`}>
                                        <div className="w-12 h-12 bg-white/5 rounded-lg overflow-hidden">
                                            {prod.image_url ? (
                                                prod.media_type === 'video' ? (
                                                    <video src={prod.image_url} className="w-full h-full object-cover" muted loop autoPlay />
                                                ) : (
                                                    <img src={prod.image_url} className="w-full h-full object-cover" />
                                                )
                                            ) : null}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold">{prod.name}</h4>
                                            <p className="text-xs text-[var(--color-text-muted)]">${prod.price}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => startEditing(prod)} className="text-blue-400 hover:bg-blue-400/10 p-2 rounded-lg transition-colors" title="Editar">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteProduct(prod.id)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors" title="Archivar">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>


                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-muted)]">
                        <List className="w-16 h-16 mb-4 opacity-20" />
                        <p>Selecciona una categoría para gestionar sus productos</p>
                    </div>
                )}
            </div>
            {/* Modal for Add/Edit Product */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={cancelEditing}>
                    <div className="bg-[var(--color-surface)] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <button onClick={cancelEditing} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>

                        <h4 className="font-bold text-xl mb-6">
                            {editingProduct ? 'Editar Producto' : `Nuevo Producto en ${selectedCategory.name}`}
                        </h4>

                        <form
                            key={editingProduct ? editingProduct.id : 'new-product-form'}
                            onSubmit={handleSaveProduct}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1">NOMBRE</label>
                                <input
                                    name="name"
                                    defaultValue={editingProduct?.name || ''}
                                    placeholder="Ej: Hamburguesa Doble"
                                    className="w-full bg-[var(--color-background)] p-3 rounded-xl outline-none border border-white/5 focus:border-[var(--color-secondary)] focus:ring-1 focus:ring-[var(--color-secondary)] transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1">PRECIO</label>
                                <input
                                    name="price"
                                    type="number"
                                    step="0.01"
                                    defaultValue={editingProduct?.price || ''}
                                    placeholder="0.00"
                                    className="w-full bg-[var(--color-background)] p-3 rounded-xl outline-none border border-white/5 focus:border-[var(--color-secondary)] focus:ring-1 focus:ring-[var(--color-secondary)] transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1">DESCRIPCIÓN</label>
                                <textarea
                                    name="description"
                                    defaultValue={editingProduct?.description || ''}
                                    placeholder="Ingredientes y detalles..."
                                    rows="3"
                                    className="w-full bg-[var(--color-background)] p-3 rounded-xl outline-none border border-white/5 focus:border-[var(--color-secondary)] focus:ring-1 focus:ring-[var(--color-secondary)] transition-all resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1">TIPO MEDIA</label>
                                    <select
                                        name="media_type"
                                        defaultValue={editingProduct?.media_type || 'image'}
                                        className="w-full bg-[var(--color-background)] p-3 rounded-xl outline-none border border-white/5 focus:border-[var(--color-secondary)] text-white"
                                    >
                                        <option value="image">Imagen 🖼️</option>
                                        <option value="video">Video 📹</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1">URL MEDIA</label>
                                    <input
                                        name="image_url"
                                        defaultValue={editingProduct?.image_url || ''}
                                        placeholder="https://..."
                                        className="w-full bg-[var(--color-background)] p-3 rounded-xl outline-none border border-white/5 focus:border-[var(--color-secondary)] focus:ring-1 focus:ring-[var(--color-secondary)] transition-all"
                                    />
                                </div>
                            </div>

                            <button type="submit" className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 ${editingProduct ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/20' : 'bg-[var(--color-secondary)] hover:bg-orange-600 hover:shadow-orange-500/20'}`}>
                                {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ProductManager
