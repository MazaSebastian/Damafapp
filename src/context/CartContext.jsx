import { createContext, useContext, useState, useEffect } from 'react'
import { useTenant } from './TenantContext'

const CartContext = createContext()

export const useCart = () => useContext(CartContext)

// localStorage key scoped to tenant
const getStorageKey = (tenantSlug) => `stacked_cart_${tenantSlug}`

export const CartProvider = ({ children }) => {
    const { tenantSlug } = useTenant()
    const [cart, setCart] = useState([])
    const [total, setTotal] = useState(0)
    const [isHydrated, setIsHydrated] = useState(false)

    // Load cart from localStorage on mount (tenant-scoped)
    useEffect(() => {
        if (!tenantSlug) return

        try {
            const stored = localStorage.getItem(getStorageKey(tenantSlug))
            if (stored) {
                const parsed = JSON.parse(stored)
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setCart(parsed)
                }
            }
        } catch (e) {
            console.warn('Failed to load cart from storage:', e)
            localStorage.removeItem(getStorageKey(tenantSlug))
        }
        setIsHydrated(true)
    }, [tenantSlug])

    // Persist cart to localStorage whenever it changes
    useEffect(() => {
        if (!tenantSlug || !isHydrated) return

        try {
            if (cart.length > 0) {
                localStorage.setItem(getStorageKey(tenantSlug), JSON.stringify(cart))
            } else {
                localStorage.removeItem(getStorageKey(tenantSlug))
            }
        } catch (e) {
            console.warn('Failed to save cart to storage:', e)
        }
    }, [cart, tenantSlug, isHydrated])

    // Recalculate total whenever cart changes
    useEffect(() => {
        const newTotal = cart.reduce((acc, item) => {
            let itemTotal = Number(item.main.price)

            // Add modifiers price
            if (item.modifiers) {
                itemTotal += item.modifiers.reduce((mAcc, mod) => mAcc + Number(mod.price), 0)
            }

            // Add Side price (if it has a price)
            if (item.side) itemTotal += Number(item.side.price)

            // Add Drink price (if it has a price)
            if (item.drink) itemTotal += Number(item.drink.price)

            // Ensure itemTotal is number
            if (isNaN(itemTotal)) itemTotal = 0

            return Number(acc) + itemTotal
        }, 0)
        setTotal(newTotal)
    }, [cart])

    const addToCart = (meal) => {
        setCart(prev => [...prev, { ...meal, id: crypto.randomUUID() }])
    }

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(item => item.id !== id))
    }

    const clearCart = () => setCart([])

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, total, isHydrated }}>
            {children}
        </CartContext.Provider>
    )
}
