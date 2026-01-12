import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Plus, Trash2, Edit2, Save, X, ChevronRight, Loader2, Image, List } from 'lucide-react'

const ProductManager = () => {
    const [categories, setCategories] = useState([])
    const [selectedCategory, setSelectedCategory] = useState(null)
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState('list') // 'list', 'edit-cat', 'edit-prod'

    useEffect(() => {
        fetchCategories()
    }, [])

    useEffect(() => {
        if (selectedCategory) {
            fetchProducts(selectedCategory.id)
        }
    }, [selectedCategory])

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

    // --- Product Handlers ---
    const handleAddProduct = async (e) => {
        e.preventDefault()
        const formData = new FormData(e.target)
        const newProduct = {
            category_id: selectedCategory.id,
            name: formData.get('name'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price')),
            image_url: formData.get('image_url'),
            is_available: true
        }

        const { data, error } = await supabase.from('products').insert([newProduct]).select()
        if (!error && data) {
            setProducts([...products, data[0]])
            e.target.reset()
        } else {
            alert('Error creating product: ' + error?.message)
        }
    }

    const handleDeleteProduct = async (id) => {
        if (!confirm('¿Archivar producto? (Esto lo ocultará del menú pero guardará el historial)')) return
        const { error } = await supabase.from('products').update({ is_available: false }).eq('id', id)
        if (!error) {
            setProducts(products.filter(p => p.id !== id))
        } else {
            alert('Error al archivar: ' + error.message)
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
        } else {
            alert('Error al eliminar: ' + error.message)
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
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                                <span className="text-xs bg-black/20 px-2 py-0.5 rounded">{cat.sort_order}</span>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id) }} className="hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
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
            <div className="lg:col-span-2 bg-[var(--color-surface)] rounded-2xl border border-white/5 flex flex-col overflow-hidden">
                {selectedCategory ? (
                    <>
                        <div className="p-4 border-b border-white/5 bg-[var(--color-background)]/50 flex justify-between items-center">
                            <h3 className="font-bold text-lg">{selectedCategory.name} <span className="text-[var(--color-text-muted)] text-sm font-normal">({products.length} productos)</span></h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {/* Product List */}
                            <div className="space-y-3 mb-6">
                                {products.map(prod => (
                                    <div key={prod.id} className="bg-[var(--color-background)] rounded-xl p-3 flex gap-4 items-center border border-white/5">
                                        <div className="w-12 h-12 bg-white/5 rounded-lg overflow-hidden">
                                            {prod.image_url ? <img src={prod.image_url} className="w-full h-full object-cover" /> : null}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold">{prod.name}</h4>
                                            <p className="text-xs text-[var(--color-text-muted)]">${prod.price}</p>
                                        </div>
                                        <button onClick={() => handleDeleteProduct(prod.id)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add Product Form */}
                            <div className="bg-[var(--color-background)]/50 rounded-xl p-4 border border-[var(--color-secondary)]/30">
                                <h4 className="font-bold mb-4 text-sm uppercase text-[var(--color-secondary)]">Nuevo Producto en {selectedCategory.name}</h4>
                                <form onSubmit={handleAddProduct} className="grid grid-cols-2 gap-4">
                                    <input name="name" placeholder="Nombre" className="col-span-2 bg-[var(--color-surface)] p-2 rounded-lg text-sm outline-none border border-white/5 focus:border-[var(--color-secondary)]" required />
                                    <input name="description" placeholder="Descripción" className="col-span-2 bg-[var(--color-surface)] p-2 rounded-lg text-sm outline-none border border-white/5 focus:border-[var(--color-secondary)]" />
                                    <input name="price" type="number" step="0.01" placeholder="Precio" className="bg-[var(--color-surface)] p-2 rounded-lg text-sm outline-none border border-white/5 focus:border-[var(--color-secondary)]" required />
                                    <input name="image_url" placeholder="URL Imagen" className="bg-[var(--color-surface)] p-2 rounded-lg text-sm outline-none border border-white/5 focus:border-[var(--color-secondary)]" />
                                    <button type="submit" className="col-span-2 bg-[var(--color-secondary)] text-white py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors">
                                        Crear Producto
                                    </button>
                                </form>
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
        </div>
    )
}

export default ProductManager
