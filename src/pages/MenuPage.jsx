import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { ArrowLeft, Search, ShoppingBag } from 'lucide-react' // ShoppingBag icon can stay as "Link to orders" or removed
import { Link, useNavigate } from 'react-router-dom'
import { MenuSkeleton } from '../components/skeletons/MenuSkeleton'
import { motion } from 'framer-motion'
import { Badge } from 'lucide-react' // Optional

const MenuPage = () => {
    const [categories, setCategories] = useState([])
    const [products, setProducts] = useState([])
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [loading, setLoading] = useState(true)
    const scrollContainerRef = useRef(null)
    const navigate = useNavigate()

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

    const getCategoryIcon = (name) => {
        const lower = name.toLowerCase()
        if (lower.includes('hamburguesa') || lower.includes('burger')) return <span className="text-2xl">🍔</span>
        if (lower.includes('papa') || lower.includes('frita') || lower.includes('acompaña')) return <span className="text-2xl">🍟</span>
        if (lower.includes('bebida') || lower.includes('refresco') || lower.includes('agua') || lower.includes('gaseosa')) return <span className="text-2xl">🥤</span>
        if (lower.includes('postre') || lower.includes('dulce') || lower.includes('helado')) return <span className="text-2xl">🍦</span>
        if (lower.includes('veggie') || lower.includes('vegan') || lower.includes('ensalada')) return <span className="text-2xl">🥗</span>
        if (lower.includes('combo') || lower.includes('cajita')) return <span className="text-2xl">🥡</span>
        if (lower.includes('pollo') || lower.includes('chicken')) return <span className="text-2xl">🍗</span>
        return <span className="text-2xl">🍽️</span>
    }

    const filteredProducts = selectedCategory === 'all'
        ? products
        : products.filter(p => p.category_id === selectedCategory)

    return (
        <div className="min-h-screen bg-[var(--color-background)] pb-24">
            {/* Header */}
            <header className="px-4 py-4 flex items-center gap-3 sticky top-0 bg-[var(--color-background)]/95 backdrop-blur-md z-40 border-b border-white/5">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por productos"
                        className="w-full bg-[var(--color-surface)] rounded-2xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)] text-white placeholder-gray-500 shadow-sm"
                    />
                </div>
            </header>

            {/* Category Tabs */}
            <div className="sticky top-[76px] bg-[var(--color-background)] z-30 pt-2 pb-4 border-b border-white/5 shadow-2xl shadow-black/20">
                <div
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto gap-4 px-4 hide-scrollbar justify-start md:justify-center"
                >
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`flex flex-col items-center gap-2 w-28 flex-shrink-0 transition-all duration-300 group`}
                    >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${selectedCategory === 'all'
                            ? 'bg-[var(--color-secondary)]/10 border-[var(--color-secondary)] text-[var(--color-secondary)] shadow-[0_0_15px_rgba(255,107,0,0.3)]'
                            : 'bg-white/5 border-transparent text-white/40 group-hover:text-white group-hover:bg-white/10'}`}>
                            <span className="text-2xl filter grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all">🔥</span>
                        </div>
                        <span className={`text-[10px] uppercase tracking-wide font-bold text-center leading-tight transition-colors ${selectedCategory === 'all' ? 'text-[var(--color-secondary)]' : 'text-gray-500 group-hover:text-gray-300'}`}>
                            Todos
                        </span>
                    </button>

                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`flex flex-col items-center gap-2 w-28 flex-shrink-0 transition-all duration-300 group`}
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all relative overflow-hidden ${selectedCategory === cat.id
                                ? 'bg-[var(--color-secondary)]/10 border-[var(--color-secondary)] text-[var(--color-secondary)] shadow-[0_0_15px_rgba(255,107,0,0.3)]'
                                : 'bg-white/5 border-transparent text-white/40 group-hover:text-white group-hover:bg-white/10'}`}>
                                {cat.image_url ? (
                                    <img src={cat.image_url} alt={cat.name} className={`w-full h-full object-cover transition-all ${selectedCategory === cat.id ? '' : 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100'}`} />
                                ) : (
                                    <span className={`text-2xl transition-all ${selectedCategory === cat.id ? '' : 'filter grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100'}`}>
                                        {getCategoryIcon(cat.name)}
                                    </span>
                                )}
                            </div>
                            <span className={`text-[10px] uppercase tracking-wide font-bold text-center leading-tight transition-colors w-full px-0.5 whitespace-normal ${selectedCategory === cat.id ? 'text-[var(--color-secondary)]' : 'text-gray-500 group-hover:text-gray-300'}`}>
                                {cat.name === 'Papas & Acompañamientos' ? 'Acompañamientos' : cat.name}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Product List - Elegant Catalog Style */}
            <main className="px-4 py-6 max-w-2xl mx-auto">
                {loading ? (
                    <MenuSkeleton />
                ) : (
                    <>
                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-2xl font-black mb-6 capitalize text-white tracking-tight"
                        >
                            {selectedCategory === 'all' ? 'Menú' : (categories.find(c => c.id === selectedCategory)?.name === 'Papas & Acompañamientos' ? 'Acompañamientos' : categories.find(c => c.id === selectedCategory)?.name)}
                        </motion.h2>

                        <div className="space-y-6">
                            {filteredProducts.map((product, index) => {
                                const isOutOfStock = product.stock !== null && product.stock === 0

                                return (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        key={product.id}
                                        className={`bg-[var(--color-surface)] rounded-2xl p-4 flex gap-4 border border-white/5 hover:border-[var(--color-secondary)]/30 transition-all group shadow-lg ${isOutOfStock ? 'opacity-60 grayscale' : ''}`}
                                    >
                                        {/* Left Side: Info */}
                                        <div className="flex-1 flex flex-col justify-start py-1">
                                            <div className="mb-2">
                                                {product.is_popular && (
                                                    <span className="inline-block bg-yellow-500/20 text-yellow-500 text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 uppercase tracking-wide border border-yellow-500/20">
                                                        Popular
                                                    </span>
                                                )}
                                                <h3 className="font-bold text-lg mb-1.5 text-white leading-snug group-hover:text-[var(--color-secondary)] transition-colors">
                                                    {product.name}
                                                </h3>
                                                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed line-clamp-3">
                                                    {product.description}
                                                </p>
                                            </div>
                                            <div className="mt-auto pt-3">
                                                <span className="text-[var(--color-secondary)] font-black text-xl tracking-tight">
                                                    $ {product.price.toLocaleString('es-AR')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Right Side: Image */}
                                        <div className="w-32 h-32 flex-shrink-0 relative">
                                            <div className="w-full h-full rounded-2xl overflow-hidden bg-black/20 shadow-inner relative">
                                                {product.image_url ? (
                                                    (product.media_type === 'video' || product.image_url.endsWith('.mp4') || product.image_url.endsWith('.webm')) ? (
                                                        <video
                                                            src={product.image_url}
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                            muted
                                                            loop
                                                            autoPlay
                                                            playsInline
                                                        />
                                                    ) : (
                                                        <img
                                                            src={product.image_url}
                                                            alt={product.name}
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                        />
                                                    )
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                                                        <span className="text-2xl">🍔</span>
                                                    </div>
                                                )}
                                            </div>

                                            {isOutOfStock && (
                                                <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] rounded-2xl flex items-center justify-center z-10">
                                                    <span className="text-[10px] uppercase font-bold text-white bg-red-600 px-3 py-1 rounded-full shadow-lg transform -rotate-6 border border-white/20">
                                                        Agotado
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )
                            })}

                            {filteredProducts.length === 0 && (
                                <div className="text-center py-20">
                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <ShoppingBag className="w-8 h-8 text-white/20" />
                                    </div>
                                    <p className="text-[var(--color-text-muted)] font-medium">No hay productos disponibles.</p>
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
