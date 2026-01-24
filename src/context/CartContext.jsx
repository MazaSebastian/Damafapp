import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext()

export const useCart = () => useContext(CartContext)

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState([])
    const [total, setTotal] = useState(0)

    useEffect(() => {
        // Recalculate total whenever cart changes
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
        setCart([...cart, { ...meal, id: crypto.randomUUID() }])
    }

    const removeFromCart = (id) => {
        setCart(cart.filter(item => item.id !== id))
    }

    const clearCart = () => setCart([])

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, total }}>
            {children}
        </CartContext.Provider>
    )
}
