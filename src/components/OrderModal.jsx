import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingBag, Plus, Loader2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

const OrderModal = ({ isOpen, onClose }) => {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        if (isOpen) {
            fetchBurgers()
        }
    }, [isOpen])

    const fetchBurgers = async () => {
        setLoading(true)
        // 1. Get 'Hamburguesas' category ID first (to be robust) or just filter by name in products if simplified
        // Let's assume we filter products by category name via join or 2 steps.
        // Step 1: Find category 'Hamburguesas'
        const { data: catData } = await supabase
            .from('categories')
            .select('id')
            .ilike('name', '%hamburguesa%')
            .single()

        if (catData) {
            const { data: prodData } = await supabase
                .from('products')
                .select('*')
                .eq('category_id', catData.id)
                .eq('is_available', true)
                .order('price', { ascending: true }) // Cheapest first or by sort_order

            if (prodData) setProducts(prodData)
        }
        setLoading(false)
    }

    const handleSelectProduct = (product) => {
        // Navigate to menu with product selected or open builder?
        // User wants "Elegí tu burga". Let's redirect to specific product builder if possible, 
        // or for now, just close modal and go to menu with that category?
        // Better: Open MealBuilder directly.
        // Since MealBuilder is likely on the MenuPage or separate route, let's navigate to menu passing state
        // OR better yet, if we can, make this modal FULLY functional (add to cart).
        // For 'PIDE AQUI' usually implies starting an order.
        // Let's navigate to /menu but maybe highlight the product? 
        // Or simpler: navigate to /menu is the fallback, but user asked for "show burgers in cards".

        // Strategy: Navigate to /menu but passing state to open specific category/product?
        // For MVP of this feature: Navigate to '/menu' is standard, but user specifically asked for "Select your burger".
        // Let's implement a direct "Add to Cart" or "Customize" flow if possible.
        // Given current architecture, let's navigate to MenuPage with category pre-selected.
        // Actually, let's make the cards clickable to go to Menu.
        onClose()
        navigate('/menu')
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 500 }}
                        className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#1a1a1a] rounded-t-3xl z-[70] max-h-[85vh] flex flex-col border-t border-white/10 shadow-2xl"
                    >
                        {/* Header */}
                        <div className="p-6 pb-4 border-b border-white/5 flex justify-between items-center relative">
                            <div>
                                <h2 className="text-2xl font-bold text-white italic">¡Elegí tu burga, <span className="text-[var(--color-secondary)]">campeón!</span> 🍔</h2>
                                <p className="text-[var(--color-text-muted)] text-sm">Las mejores de la ciudad</p>
                            </div>
                            <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {loading ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="w-8 h-8 text-[var(--color-secondary)] animate-spin" />
                                </div>
                            ) : products.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {products.map(product => (
                                        <div
                                            key={product.id}
                                            onClick={() => handleSelectProduct(product)}
                                            className="bg-[var(--color-surface)] rounded-xl overflow-hidden border border-white/5 active:scale-95 transition-transform"
                                        >
                                            <div className="aspect-square bg-white/5 relative">
                                                {product.image_url ? (
                                                    product.media_type === 'video' ? (
                                                        <video src={product.image_url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                                                    ) : (
                                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                                    )
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-4xl">🍔</div>
                                                )}

                                                <button className="absolute bottom-2 right-2 bg-[var(--color-secondary)] p-1.5 rounded-full text-white shadow-lg">
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="p-3">
                                                <h3 className="font-bold text-sm text-white leading-tight mb-1">{product.name}</h3>
                                                <p className="text-[var(--color-secondary)] font-bold text-sm">${product.price}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-[var(--color-text-muted)] py-10">No encontramos hamburguesas disponibles :(</p>
                            )}

                            <button onClick={onClose} className="w-full py-4 text-center text-[var(--color-text-muted)] text-sm underline mt-4">
                                Ver menú completo
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default OrderModal
