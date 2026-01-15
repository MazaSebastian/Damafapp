import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowLeft, Loader2, Plus } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { toast } from 'sonner'

const OrderModal = ({ isOpen, onClose }) => {
    const [step, setStep] = useState(1) // 1: Burger, 1.5: Modifiers, 2: Sides, 3: Drinks
    const [products, setProducts] = useState([])
    const [modifiers, setModifiers] = useState([])
    const [sides, setSides] = useState([])
    const [drinks, setDrinks] = useState([])

    const [selectedBurger, setSelectedBurger] = useState(null)
    const [selectedModifiers, setSelectedModifiers] = useState({}) // { modifierId: quantity }
    const [removedIngredients, setRemovedIngredients] = useState([]) // List of strings
    const [selectedSide, setSelectedSide] = useState(null)

    const [loading, setLoading] = useState(true)

    const navigate = useNavigate()
    const { addToCart } = useCart()

    useEffect(() => {
        if (isOpen) {
            resetModal()
            fetchBurgers()
            // fetchModifiers() removed, we fetch on burger select
        }
    }, [isOpen])

    const resetModal = () => {
        setStep(1)
        setSelectedBurger(null)
        setSelectedModifiers({})
        setRemovedIngredients([])
        setSelectedSide(null)
        setProducts([])
        setModifiers([])
        setSides([])
        setDrinks([])
    }

    const fetchBurgers = async () => {
        setLoading(true)
        const { data: catData } = await supabase.from('categories').select('id').ilike('name', '%hamburguesa%').single()
        if (catData) {
            const { data } = await supabase.from('products').select('*').eq('category_id', catData.id).eq('is_available', true).order('price', { ascending: true })
            if (data) setProducts(data)
        }
        setLoading(false)
    }

    const fetchProductModifiers = async (productId) => {
        // Fetch modifiers linked to this product via product_modifiers table
        const { data, error } = await supabase
            .from('product_modifiers')
            .select(`
                modifier_id,
                modifiers ( * )
            `)
            .eq('product_id', productId)

        if (data) {
            // Filter out unavailable ones and map properties
            const activeModifiers = data
                .map(item => item.modifiers)
                .filter(m => m && m.is_available)
                .sort((a, b) => a.name.localeCompare(b.name))

            setModifiers(activeModifiers)
        } else {
            console.error(error)
            setModifiers([])
        }
    }

    const fetchSides = async () => {
        setLoading(true)
        const { data: catData } = await supabase.from('categories').select('id').or('name.ilike.%papa%,name.ilike.%acompañamiento%').limit(1).single()
        if (catData) {
            const { data } = await supabase.from('products').select('*').eq('category_id', catData.id).eq('is_available', true).order('price', { ascending: true })
            if (data) setSides(data)
        }
        setLoading(false)
    }

    const fetchDrinks = async () => {
        setLoading(true)
        const { data: catData } = await supabase.from('categories').select('id').ilike('name', '%bebida%').limit(1).single()
        if (catData) {
            const { data } = await supabase.from('products').select('*').eq('category_id', catData.id).eq('is_available', true).order('price', { ascending: true })
            if (data) setDrinks(data)
        }
        setLoading(false)
    }

    const handleSelectBurger = (burger) => {
        setSelectedBurger(burger)
        fetchProductModifiers(burger.id)
        setStep(1.5) // Go to modifiers
    }

    const handleModifiersNext = () => {
        setStep(2)
        fetchSides()
    }

    const handleSelectSide = (side) => {
        setSelectedSide(side)
        setStep(3)
        fetchDrinks()
    }

    const handleSelectDrink = (drink) => {
        if (!selectedBurger) return

        // Format modifiers for cart
        const modifiersList = Object.entries(selectedModifiers).map(([modId, qty]) => {
            const mod = modifiers.find(m => m.id === modId)
            return { ...mod, quantity: qty }
        }).filter(m => m.quantity > 0)

        // Construct notes including removable ingredients
        let notesParts = ['Desde modal rápido']
        if (removedIngredients.length > 0) {
            notesParts.push(`SIN: ${removedIngredients.join(', ')}`)
        }

        const comboItem = {
            main: { ...selectedBurger, notes: notesParts.join('. ') },
            modifiers: modifiersList,
            side: selectedSide ? { ...selectedSide } : null,
            drink: drink ? { ...drink } : null,
            removed_ingredients: removedIngredients // Also store structured
        }

        addToCart(comboItem)
        toast.success('¡Combo completo agregado!')
        onClose()
        navigate('/checkout')
    }

    const handleBack = () => {
        if (step === 3) setStep(2)
        else if (step === 2) setStep(1.5)
        else if (step === 1.5) {
            setStep(1)
            setSelectedModifiers({})
            setRemovedIngredients([])
        }
    }

    const updateModifierQuantity = (modId, delta) => {
        setSelectedModifiers(prev => {
            const current = prev[modId] || 0
            const next = Math.max(0, current + delta)
            if (next === 0) {
                const { [modId]: _, ...rest } = prev
                return rest
            }
            return { ...prev, [modId]: next }
        })
    }

    const toggleIngredientRemoval = (ingredient) => {
        setRemovedIngredients(prev => {
            if (prev.includes(ingredient)) {
                return prev.filter(i => i !== ingredient)
            } else {
                return [...prev, ingredient]
            }
        })
    }

    // Calculation helper
    const getCurrentTotal = () => {
        let total = selectedBurger?.price || 0

        // Add modifiers
        Object.entries(selectedModifiers).forEach(([modId, qty]) => {
            const mod = modifiers.find(m => m.id === modId)
            if (mod) total += mod.price * qty
        })

        if (selectedSide) total += selectedSide.price
        return total
    }

    // Helper to get current list based on step
    const getCurrentList = () => {
        if (step === 1) return products
        if (step === 2) return sides
        if (step === 3) return drinks
        return []
    }

    const currentList = getCurrentList()

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                    />

                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 500 }}
                        className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#1a1a1a] rounded-t-3xl z-[70] max-h-[85vh] flex flex-col border-t border-white/10 shadow-2xl"
                    >
                        {/* Header */}
                        <div className="p-6 pb-4 border-b border-white/5 flex justify-between items-center relative">
                            <div className="flex items-center gap-3">
                                {step > 1 && (
                                    <button onClick={handleBack} className="p-1 rounded-full hover:bg-white/10 transition-colors">
                                        <ArrowLeft className="w-5 h-5 text-white" />
                                    </button>
                                )}
                                <div>
                                    <h2 className="text-xl md:text-2xl font-bold text-white italic leading-tight">
                                        {step === 1 && <>¡Elegí tu burga, <span className="text-[var(--color-secondary)]">campeón!</span> 🍔</>}
                                        {step === 1.5 && <>¡Hacetela <span className="text-[var(--color-secondary)]">gigante!</span> 🥓</>}
                                        {step === 2 && <>¿Con qué la vas a <span className="text-[var(--color-secondary)]">acompañar</span>, rey? 🍟</>}
                                        {step === 3 && <>¿Y para <span className="text-[var(--color-secondary)]">bajarla</span>? 🥤</>}
                                    </h2>
                                    {step === 1 && <p className="text-[var(--color-text-muted)] text-sm">Las mejores de la ciudad</p>}
                                    {step === 1.5 && <p className="text-[var(--color-text-muted)] text-sm">Agregale lo que quieras</p>}
                                </div>
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
                            ) : (
                                <>
                                    {step === 1.5 ? (
                                        // MODIFIERS VIEW
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                                                <div className="w-16 h-16 rounded-lg bg-black/20 overflow-hidden">
                                                    {selectedBurger?.image_url && (
                                                        selectedBurger.media_type === 'video' ? (
                                                            <video src={selectedBurger.image_url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                                                        ) : (
                                                            <img src={selectedBurger.image_url} className="w-full h-full object-cover" />
                                                        )
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white mb-1">{selectedBurger?.name}</h3>
                                                    <p className="text-[var(--color-secondary)] font-bold text-lg">${getCurrentTotal().toLocaleString()}</p>
                                                </div>
                                            </div>

                                            {/* Removable Ingredients Section */}
                                            {selectedBurger?.removable_ingredients?.length > 0 && (
                                                <div className="bg-[var(--color-surface)] p-4 rounded-xl border border-white/5">
                                                    <h4 className="font-bold text-white mb-3 text-sm flex items-center gap-2">
                                                        🚫 ¿Le sacamos algo?
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {selectedBurger.removable_ingredients.map(ing => (
                                                            <label key={ing} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${removedIngredients.includes(ing) ? 'bg-red-500/10 border-red-500/50' : 'bg-black/20 border-transparent hover:bg-white/5'}`}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={removedIngredients.includes(ing)}
                                                                    onChange={() => toggleIngredientRemoval(ing)}
                                                                    className="accent-red-500 w-4 h-4"
                                                                />
                                                                <span className={`text-sm font-medium ${removedIngredients.includes(ing) ? 'text-red-400' : 'text-gray-300'}`}>
                                                                    Sin {ing}
                                                                </span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Extras Section */}
                                            <div className="space-y-3">
                                                <h4 className="font-bold text-white text-sm flex items-center gap-2 px-1">
                                                    🥓 ¿Algún extra?
                                                </h4>
                                                {modifiers.map(mod => {
                                                    const qty = selectedModifiers[mod.id] || 0
                                                    return (
                                                        <div key={mod.id} className="bg-[var(--color-surface)] p-3 rounded-xl border border-white/5 flex items-center justify-between">
                                                            <div>
                                                                <p className="font-bold text-white">{mod.name}</p>
                                                                <p className="text-[var(--color-secondary)] text-sm font-bold">+${mod.price}</p>
                                                            </div>
                                                            <div className="flex items-center gap-3 bg-black/30 rounded-lg p-1">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); updateModifierQuantity(mod.id, -1) }}
                                                                    className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${qty > 0 ? 'bg-white/10 hover:bg-white/20 text-white' : 'text-gray-600'}`}
                                                                    disabled={qty === 0}
                                                                >
                                                                    -
                                                                </button>
                                                                <span className="w-6 text-center font-bold text-white">{qty}</span>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); updateModifierQuantity(mod.id, 1) }}
                                                                    className="w-8 h-8 rounded-md bg-[var(--color-secondary)] text-white flex items-center justify-center hover:bg-orange-600"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                                {modifiers.length === 0 && <p className="text-center text-[var(--color-text-muted)] py-4 text-sm">No hay extras disponibles para este combo.</p>}
                                            </div>

                                            <button
                                                onClick={handleModifiersNext}
                                                className="w-full bg-[var(--color-secondary)] text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition-colors mt-4 shadow-lg active:scale-95 transform duration-100"
                                            >
                                                Siguiente Paso
                                            </button>
                                        </div>
                                    ) : (
                                        // PRODUCT LIST VIEW (Step 1, 2, 3)
                                        <div className="grid grid-cols-2 gap-3">
                                            {currentList.map(product => (
                                                <div
                                                    key={product.id}
                                                    onClick={() => {
                                                        if (step === 1) handleSelectBurger(product)
                                                        else if (step === 2) handleSelectSide(product)
                                                        else if (step === 3) handleSelectDrink(product)
                                                    }}
                                                    className="bg-[var(--color-surface)] rounded-xl overflow-hidden border border-white/5 active:scale-95 transition-transform cursor-pointer relative group"
                                                >
                                                    <div className="aspect-square bg-white/5 relative">
                                                        {product.image_url ? (
                                                            product.media_type === 'video' ? (
                                                                <video src={product.image_url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                                                            ) : (
                                                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                                            )
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-4xl">
                                                                {step === 1 ? '🍔' : step === 2 ? '🍟' : '🥤'}
                                                            </div>
                                                        )}

                                                        {step === 1 && (
                                                            <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                                                                <p className="text-white text-xs text-center font-medium leading-relaxed line-clamp-5">
                                                                    {product.description || "¡Una verdadera delicia!"}
                                                                </p>
                                                            </div>
                                                        )}

                                                        <button className="absolute bottom-2 right-2 bg-[var(--color-secondary)] p-1.5 rounded-full text-white shadow-lg z-20">
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <div className="p-3">
                                                        <h3 className="font-bold text-sm text-white leading-tight mb-1">{product.name}</h3>
                                                        <p className="text-[var(--color-secondary)] font-bold text-sm">${product.price}</p>
                                                    </div>
                                                </div>
                                            ))}

                                            {(step === 2 || step === 3) && (
                                                <div
                                                    onClick={() => step === 2 ? handleSelectSide(null) : handleSelectDrink(null)}
                                                    className="bg-[var(--color-surface)]/50 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center p-4 cursor-pointer hover:bg-white/5 transition-colors text-center"
                                                >
                                                    <span className="text-2xl mb-2">👋</span>
                                                    <p className="text-white font-bold text-sm">
                                                        {step === 2 ? 'Sin acompañamiento' : 'Sin bebida'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {(currentList.length === 0 && !loading && step !== 1.5) && (
                                        <p className="text-center text-[var(--color-text-muted)] py-10">No encontramos productos :(</p>
                                    )}

                                    {step === 1 && (
                                        <button onClick={() => { onClose(); navigate('/menu') }} className="w-full py-4 text-center text-[var(--color-text-muted)] text-sm underline mt-4">
                                            Ver menú completo
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default OrderModal
