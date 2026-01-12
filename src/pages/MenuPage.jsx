import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { ArrowLeft, Search, Loader2, Plus, Minus, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'

const MenuPage = () => {
    const [categories, setCategories] = useState([])
    const [products, setProducts] = useState([])
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [loading, setLoading] = useState(true)
    const scrollContainerRef = useRef(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        // Fetch Categories
        const { data: cats } = await supabase.from('categories').select('*').order('sort_order', { ascending: true })
        if (cats) setCategories(cats)

        // Fetch Products
        const { data: prods } = await supabase.from('products').select('*').eq('is_available', true)
        if (prods) setProducts(prods)

        setLoading(false)
    }

    const filteredProducts = selectedCategory === 'all'
        ? products
        : products.filter(p => p.category_id === selectedCategory)

    // Helper to scroll tabs
    const scrollTabs = (direction) => {
        // Implementation for smooth scroll if needed, or just let user swipe
    }

    return (
        <div className="min-h-screen bg-[var(--color-background)] pb-24">
            {/* Header */}
            <header className="p-4 flex items-center justify-between sticky top-0 bg-[var(--color-background)]/95 backdrop-blur-md z-40 border-b border-white/5">
                <Link to="/" className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div className="flex-1 px-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" placeholder="Buscar..." className="w-full bg-[var(--color-surface)] rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 ring-[var(--color-secondary)]" />
                    </div>
                </div>
            </header>

            {/* Category Tabs */}
            <div className="sticky top-[73px] bg-[var(--color-background)] z-30 pt-2 pb-2">
                <div
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto gap-3 px-4 hide-scrollbar"
                >
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors ${selectedCategory === 'all' ? 'bg-[var(--color-secondary)] text-white' : 'bg-[var(--color-surface)] text-gray-400 hover:text-white'}`}
                    >
                        Todos
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors ${selectedCategory === cat.id ? 'bg-[var(--color-secondary)] text-white' : 'bg-[var(--color-surface)] text-gray-400 hover:text-white'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Product Grid */}
            <main className="px-4 py-4">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-secondary)]" />
                    </div>
                ) : (
                    <>
                        <h2 className="text-xl font-bold mb-4 capitalize">
                            {selectedCategory === 'all' ? 'Menú Completo' : categories.find(c => c.id === selectedCategory)?.name}
                        </h2>

                        <div className="grid grid-cols-1 gap-6">
                            {filteredProducts.map(product => (
                                <div key={product.id} className="bg-[var(--color-surface)] rounded-xl p-3 flex gap-4 border border-white/5 hover:border-[var(--color-secondary)]/50 transition-all cursor-pointer group">
                                    {/* Image */}
                                    <div className="w-28 h-28 bg-black/30 rounded-lg overflow-hidden flex-shrink-0">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-3xl">🍔</div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                            <h3 className="font-bold text-lg leading-tight mb-1">{product.name}</h3>
                                            <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">{product.description}</p>
                                        </div>
                                        <div className="flex justify-between items-end mt-2">
                                            <span className="text-[var(--color-secondary)] font-bold text-lg">${product.price}</span>
                                            <button className="bg-[var(--color-primary)] p-2 rounded-lg text-white hover:bg-purple-700 transition-colors shadow-lg active:scale-95">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {filteredProducts.length === 0 && (
                                <div className="text-center py-10 text-[var(--color-text-muted)]">
                                    No hay productos en esta categoría.
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    )
}

export default MenuPage
