import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { ArrowLeft, Search, Loader2, Plus, Minus, ShoppingBag } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { toast } from 'sonner'
import MealBuilder from '../components/MealBuilder'
import { MenuSkeleton } from '../components/skeletons/MenuSkeleton'
import GuestAlertModal from '../components/GuestAlertModal'

const MenuPage = () => {
    const [categories, setCategories] = useState([])
    const [products, setProducts] = useState([])
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [loading, setLoading] = useState(true)
    const scrollContainerRef = useRef(null)
    const navigate = useNavigate()
    const { user } = useAuth()
    const { cart } = useCart()

    // Meal Builder State
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [isBuilderOpen, setIsBuilderOpen] = useState(false)
    const [currentCategorySlug, setCurrentCategorySlug] = useState('')

    // Guest Alert State
    const [showGuestAlert, setShowGuestAlert] = useState(false)

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

    const handleProductClick = (product) => {
        // Find category slug for the product to filter modifiers
        const cat = categories.find(c => c.id === product.category_id)
        if (cat) {
            setCurrentCategorySlug(cat.slug)
            setSelectedProduct(product)
            setIsBuilderOpen(true)
        }
    }

    const handleCheckoutClick = () => {
        if (cart.length === 0) {
            toast('Tu carrito está vacío', { icon: '🛒' })
            return
        }

        if (user) {
            navigate('/checkout')
            return
        }

        // Guest logic - Show Modal
        setShowGuestAlert(true)
    }

    return (
        <div className="min-h-screen bg-[var(--color-background)] pb-24">
            <GuestAlertModal
                isOpen={showGuestAlert}
                onClose={() => setShowGuestAlert(false)}
                onContinueAsGuest={() => {
                    setShowGuestAlert(false)
                    navigate('/checkout')
                }}
            />

            <MealBuilder
                isOpen={isBuilderOpen}
                onClose={() => setIsBuilderOpen(false)}
                product={selectedProduct}
                categorySlug={currentCategorySlug}
            />

            {/* Header */}
            <header className="p-4 flex items-center justify-between sticky top-0 bg-[var(--color-background)]/95 backdrop-blur-md z-40 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Link to="/" className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <button onClick={handleCheckoutClick} className="relative p-2 rounded-full hover:bg-white/10 transition-colors">
                        <ShoppingBag className="w-6 h-6 text-white hover:text-[var(--color-secondary)] transition-colors" />
                        {cart.length > 0 && (
                            <span className="absolute top-1 right-0 bg-[var(--color-secondary)] text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse border border-[var(--color-background)]">
                                {cart.length}
                            </span>
                        )}
                    </button>
                </div>
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
                    <MenuSkeleton />
                ) : (
                    <>
                        <h2 className="text-xl font-bold mb-4 capitalize">
                            {selectedCategory === 'all' ? 'Menú Completo' : categories.find(c => c.id === selectedCategory)?.name}
                        </h2>

                        <div className="grid grid-cols-1 gap-6">
                            {filteredProducts.map(product => {
                                const isOutOfStock = product.stock !== null && product.stock === 0

                                return (
                                    <div
                                        key={product.id}
                                        onClick={() => !isOutOfStock && handleProductClick(product)}
                                        className={`bg-[var(--color-surface)] rounded-xl p-3 flex gap-4 border border-white/5 transition-all group ${isOutOfStock ? 'opacity-60 cursor-not-allowed grayscale' : 'hover:border-[var(--color-secondary)]/50 cursor-pointer'}`}
                                    >
                                        {/* Image */}
                                        <div className="w-28 h-28 bg-black/30 rounded-lg overflow-hidden flex-shrink-0 relative">
                                            {product.image_url ? (
                                                product.media_type === 'video' ? (
                                                    <video
                                                        src={product.image_url}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                        muted
                                                        loop
                                                        autoPlay
                                                        playsInline
                                                    />
                                                ) : (
                                                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                )
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-3xl">🍔</div>
                                            )}
                                            {isOutOfStock && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                    <span className="text-[10px] uppercase font-bold text-white bg-red-600 px-2 py-1 rounded shadow-lg transform -rotate-12">
                                                        Agotado
                                                    </span>
                                                </div>
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
                                                <button disabled={isOutOfStock} className={`p-2 rounded-lg text-white shadow-lg transition-colors ${isOutOfStock ? 'bg-gray-600 cursor-not-allowed' : 'bg-[var(--color-primary)] hover:bg-purple-700 active:scale-95'}`}>
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}

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
