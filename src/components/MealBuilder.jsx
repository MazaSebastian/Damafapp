import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { X, ChevronRight, Check, Plus, Minus, ArrowLeft } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useNavigate } from 'react-router-dom'

const MealBuilder = ({ product, isOpen, onClose, categorySlug }) => {
    const [step, setStep] = useState(1) // 1: Customize, 2: Side, 3: Drink
    const [modifiers, setModifiers] = useState([])
    const [selectedModifiers, setSelectedModifiers] = useState([])

    // Available Options
    const [sides, setSides] = useState([])
    const [drinks, setDrinks] = useState([])

    // Selections
    const [selectedSide, setSelectedSide] = useState(null)
    const [selectedDrink, setSelectedDrink] = useState(null)

    const { addToCart } = useCart()
    const navigate = useNavigate()

    useEffect(() => {
        if (isOpen && product) {
            fetchData()
            setStep(1)
            setSelectedModifiers([])
            setSelectedSide(null)
            setSelectedDrink(null)
        }
    }, [isOpen, product])

    const fetchData = async () => {
        // Fetch Modifiers for this category
        const { data: mods } = await supabase.from('modifiers').select('*').in('category_slug', [categorySlug, 'all']).eq('is_available', true)
        if (mods) setModifiers(mods)

        // Fetch Sides (slug: 'sides' or 'acompanamientos' -> we used 'sides' in SQL)
        // We need the category ID for 'sides' and 'drinks'
        // Let's create a helper to get products by category slug logic or just join.
        // For simplicity, we fetch categories first then products.

        const { data: cats } = await supabase.from('categories').select('id, slug')
        const sidesCat = cats?.find(c => c.slug === 'sides')
        const drinksCat = cats?.find(c => c.slug === 'drinks')

        if (sidesCat) {
            const { data: s } = await supabase.from('products').select('*').eq('category_id', sidesCat.id).eq('is_available', true)
            setSides(s || [])
        }
        if (drinksCat) {
            const { data: d } = await supabase.from('products').select('*').eq('category_id', drinksCat.id).eq('is_available', true)
            setDrinks(d || [])
        }
    }

    const toggleModifier = (mod) => {
        if (selectedModifiers.find(m => m.id === mod.id)) {
            setSelectedModifiers(selectedModifiers.filter(m => m.id !== mod.id))
        } else {
            setSelectedModifiers([...selectedModifiers, mod])
        }
    }

    const calculateTotal = () => {
        let total = product?.price || 0
        total += selectedModifiers.reduce((acc, m) => acc + m.price, 0)
        if (selectedSide) total += selectedSide.price
        if (selectedDrink) total += selectedDrink.price
        return total
    }

    const handleNext = () => {
        if (step < 3) setStep(step + 1)
        else {
            // Finish
            addToCart({
                main: product,
                modifiers: selectedModifiers,
                side: selectedSide,
                drink: selectedDrink
            })
            onClose()
            navigate('/checkout')
        }
    }

    if (!isOpen || !product) return null

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="bg-[var(--color-surface)] w-full max-w-lg h-[90vh] md:h-auto md:max-h-[85vh] rounded-t-2xl md:rounded-2xl flex flex-col overflow-hidden relative animate-slide-up">

                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {step > 1 && (
                            <button onClick={() => setStep(step - 1)} className="p-1 hover:bg-white/10 rounded-full"><ArrowLeft className="w-5 h-5" /></button>
                        )}
                        <h2 className="font-bold text-lg">
                            {step === 1 && 'Personaliza tu Hamburguesa'}
                            {step === 2 && 'Elige un Acompañamiento'}
                            {step === 3 && 'Elige tu Bebida'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><X className="w-5 h-5" /></button>
                </div>

                {/* Progress Bar */}
                <div className="flex h-1 bg-white/5">
                    <div className="bg-[var(--color-secondary)] transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }}></div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">

                    {/* STEP 1: MODIFIERS */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="flex items-start gap-4 p-4 bg-[var(--color-background)] rounded-xl border border-white/5">
                                {product.media_type === 'video' ? (
                                    <video src={product.image_url} className="w-20 h-20 object-cover rounded-lg" muted loop autoPlay playsInline />
                                ) : (
                                    <img src={product.image_url} alt={product.name} className="w-20 h-20 object-cover rounded-lg" />
                                )}
                                <div>
                                    <h3 className="font-bold text-lg">{product.name}</h3>
                                    <p className="text-[var(--color-text-muted)] text-xs">{product.description}</p>
                                    <span className="block mt-2 font-bold text-[var(--color-secondary)]">${product.price}</span>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold mb-3 text-sm uppercase tracking-wider text-[var(--color-text-muted)]">Extras & Modificaciones</h4>
                                <div className="space-y-3">
                                    {modifiers.map(mod => {
                                        const isSelected = selectedModifiers.find(m => m.id === mod.id)
                                        return (
                                            <div
                                                key={mod.id}
                                                onClick={() => toggleModifier(mod)}
                                                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-[var(--color-secondary)] bg-[var(--color-secondary)]/10' : 'border-white/5 bg-[var(--color-background)] hover:border-white/20'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-[var(--color-secondary)] border-[var(--color-secondary)]' : 'border-gray-500'}`}>
                                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <span className={isSelected ? 'font-bold text-white' : 'text-gray-300'}>{mod.name}</span>
                                                </div>
                                                <span className="text-sm font-semibold">
                                                    {mod.price > 0 ? `+$${mod.price}` : 'Gratis'}
                                                </span>
                                            </div>
                                        )
                                    })}
                                    {modifiers.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">No hay extras disponibles para este producto.</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: SIDES */}
                    {step === 2 && (
                        <div className="grid grid-cols-2 gap-4">
                            {sides.map(side => (
                                <div
                                    key={side.id}
                                    onClick={() => setSelectedSide(side)}
                                    className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${selectedSide?.id === side.id ? 'border-[var(--color-secondary)] ring-2 ring-[var(--color-secondary)]/30' : 'border-transparent'}`}
                                >
                                    <div className="h-32 bg-black/40">
                                        <img src={side.image_url} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="p-3 bg-[var(--color-background)]">
                                        <h4 className="font-bold text-sm mb-1">{side.name}</h4>
                                        <span className="text-xs text-[var(--color-secondary)] font-bold">+${side.price}</span>
                                    </div>
                                    {selectedSide?.id === side.id && (
                                        <div className="absolute top-2 right-2 bg-[var(--color-secondary)] rounded-full p-1">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* STEP 3: DRINKS */}
                    {step === 3 && (
                        <div className="grid grid-cols-2 gap-4">
                            {drinks.map(drink => (
                                <div
                                    key={drink.id}
                                    onClick={() => setSelectedDrink(drink)}
                                    className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${selectedDrink?.id === drink.id ? 'border-[var(--color-secondary)] ring-2 ring-[var(--color-secondary)]/30' : 'border-transparent'}`}
                                >
                                    <div className="h-32 bg-black/40">
                                        <img src={drink.image_url} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="p-3 bg-[var(--color-background)]">
                                        <h4 className="font-bold text-sm mb-1">{drink.name}</h4>
                                        <span className="text-xs text-[var(--color-secondary)] font-bold">+${drink.price}</span>
                                    </div>
                                    {selectedDrink?.id === drink.id && (
                                        <div className="absolute top-2 right-2 bg-[var(--color-secondary)] rounded-full p-1">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                </div>

                {/* Footer / Actions */}
                <div className="p-4 border-t border-white/5 bg-[var(--color-background)]/50">
                    <div className="flex justify-between items-center mb-4 text-sm font-medium text-[var(--color-text-muted)]">
                        <span>Total estimado:</span>
                        <span className="text-xl font-bold text-white">${calculateTotal().toFixed(2)}</span>
                    </div>
                    <button
                        onClick={handleNext}
                        disabled={(step === 2 && !selectedSide) || (step === 3 && !selectedDrink)}
                        className="w-full bg-[var(--color-secondary)] text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {step === 3 ? 'Finalizar y Agregar' : 'Siguiente Paso'}
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

            </div>
        </div>
    )
}

export default MealBuilder
