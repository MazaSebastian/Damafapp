import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import OrderModal from './OrderModal'

const POSModal = ({ isOpen, onClose, onSuccess }) => {
    const [products, setProducts] = useState([])
    const [cart, setCart] = useState([])
    const [loading, setLoading] = useState(true)
    const [processLoading, setProcessLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [customizingProduct, setCustomizingProduct] = useState(null)

    // Initial Load
    useEffect(() => {
        if (isOpen) {
            fetchProducts()
            // Reset session on open
            updateCustomerDisplay([], 'active')
        } else {
            // Reset session on close to idle
            updateCustomerDisplay([], 'idle')
            setCart([])
            setSearchTerm('')
        }
    }, [isOpen])

    // Realtime Sync to Customer Display
    useEffect(() => {
        if (isOpen) {
            const status = cart.length > 0 ? 'active' : 'active' // Keep active while modal is open basically
            updateCustomerDisplay(cart, status)
        }
    }, [cart])

    const fetchProducts = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('products')
            .select('*')
            .eq('is_available', true)

        if (data) setProducts(data)
        setLoading(false)
    }

    const updateCustomerDisplay = async (currentCart, statusOverride, qrUrl = null, method = null) => {
        // Calculate totals
        const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        const total = subtotal

        const payload = {
            status: statusOverride || (currentCart.length > 0 ? 'active' : 'idle'),
            cart_items: currentCart,
            subtotal: subtotal,
            total: total,
            qr_code_url: qrUrl,
            updated_at: new Date().toISOString()
        }

        if (method) payload.payment_method = method

        // We update the singleton row
        // We catch errors to avoid unhandled rejections if network blips
        await supabase
            .from('checkout_sessions')
            .update(payload)
            .eq('id', '00000000-0000-0000-0000-000000000000')
            .then()
    }

    const initiateAddToCart = (product) => {
        setCustomizingProduct(product)
    }

    const handleAddToCartFromModal = (customItem) => {
        setCart(prev => [...prev, customItem])
        setCustomizingProduct(null)
    }

    /* 
       Review: Simple add is replaced by customization flow. 
       If we wanted to skip customization for simple products, we'd check here.
       But for now, everything goes through customization as requested.
    */


    const updateQuantity = (productId, delta) => {
        setCart(prev => prev.map(p => {
            if (p.id === productId) {
                const newQty = Math.max(0, p.quantity + delta)
                return { ...p, quantity: newQty }
            }
            return p
        }).filter(p => p.quantity > 0))
    }

    const handleCheckout = async (method) => {
        if (cart.length === 0) return

        try {
            setProcessLoading(true)
            const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

            // 1. Create Order in DB (Pending)
            const { data: userData } = await supabase.auth.getUser()

            const orderPayload = {
                user_id: userData.user?.id,
                status: 'pending', // Goes to kitchen
                total: subtotal,
                payment_method: method,
                order_type: 'takeaway',
                payment_status: method === 'cash' ? 'paid' : 'pending', // MP is pending initially
                delivery_address: 'Retiro en Local'
            }

            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert(orderPayload)
                .select()
                .single()

            if (orderError) throw orderError

            // 2. Create Order Items
            const orderItems = cart.map(item => ({
                order_id: orderData.id,
                product_id: item.id,
                quantity: item.quantity,
                unit_price: item.price,
                price_at_time: item.price,
                notes: item.notes || ''
            }))

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems)

            if (itemsError) throw itemsError

            // 3. Handle Payment Method
            if (method === 'cash') {
                // Immediate Success
                await finalizeOrder(orderData.id, 'paid', subtotal)
                toast.success(`Pedido #${orderData.id.slice(0, 6)} completado (Efectivo) 💵`)
                closeModalAfterDelay()
            } else if (method === 'mercadopago') {
                // Generate QR via Edge Function
                toast.loading('Generando QR de pago...')

                const { data: mpData, error: mpError } = await supabase.functions.invoke('create-payment-preference', {
                    body: { order_id: orderData.id }
                })

                if (mpError) throw new Error('Error conectando con MP: ' + mpError.message)
                if (!mpData?.init_point) throw new Error('No se recibió URL de pago')

                // Show QR on Customer Display
                await updateCustomerDisplay(cart, 'active', mpData.init_point, method)

                toast.dismiss()
                toast.success('¡QR generado! Cliente escaneando...')
                setProcessLoading(false)
            } else if (method === 'transfer') {
                // Show Bank Details on Customer Display
                toast.loading('Mostrando datos bancarios...')

                // We pass method 'transfer' so LiveCartView knows to fetch bank details
                await updateCustomerDisplay(cart, 'active', null, method)

                toast.dismiss()
                toast.success('Datos bancarios mostrados al cliente')
                setProcessLoading(false)
            }

        } catch (error) {
            console.error('Checkout error:', error)
            toast.dismiss()
            toast.error('Error: ' + error.message)
            setProcessLoading(false)
        }
    }

    const finalizeOrder = async (orderId, paymentStatus, totalAmount) => {
        // Update Session to Success
        await supabase
            .from('checkout_sessions')
            .update({
                status: 'payment_success',
                payment_method: 'cash',
                total: totalAmount,
                qr_code_url: null
            })
            .eq('id', '00000000-0000-0000-0000-000000000000')
    }

    const closeModalAfterDelay = () => {
        setTimeout(() => {
            onSuccess?.()
            onClose()
        }, 2000)
    }



    if (!isOpen) return null

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedCategory === 'all' || p.category === selectedCategory)
    )

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[var(--color-surface)] w-full max-w-6xl h-[90vh] rounded-3xl border border-white/10 shadow-2xl flex overflow-hidden relative animate-in fade-in zoom-in duration-300">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-red-500 hover:text-white rounded-full transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* LEFT: Product Grid (65%) */}
                <div className="w-2/3 flex flex-col border-r border-white/5 bg-[var(--color-background)]">
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex gap-4 items-center">
                        <h2 className="text-2xl font-bold text-white">Nuevo Pedido</h2>
                        <div className="h-6 w-px bg-white/10 mx-2" />
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Buscar productos..."
                                className="w-full bg-[var(--color-surface)] rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-1 ring-[var(--color-primary)] transition-all"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Grid */}
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 lg:grid-cols-3 gap-4 content-start custom-scrollbar">
                            {filteredProducts.map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => initiateAddToCart(product)}
                                    className="bg-[var(--color-surface)] p-4 rounded-xl border border-white/5 hover:border-[var(--color-primary)] transition-all text-left flex flex-col h-32 relative group"
                                >
                                    <div className="flex-1">
                                        <h3 className="font-bold text-sm line-clamp-2">{product.name}</h3>
                                        <p className="text-[var(--color-text-muted)] text-sm absolute bottom-3 left-3">${product.price}</p>
                                    </div>
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--color-primary)] rounded-full p-1">
                                        <Plus className="w-3 h-3" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* RIGHT: Cart (35%) */}
                <div className="w-1/3 flex flex-col bg-[var(--color-surface)]">
                    <div className="p-6 border-b border-white/5 font-bold text-lg flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5" /> Carrito
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {cart.map(item => (
                            <div key={item.unique_id || item.id} className="flex flex-col bg-[var(--color-background)]/50 p-3 rounded-lg border border-white/5 animated-item">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex-1 min-w-0 mr-2">
                                        <div className="font-medium truncate text-sm">{item.name}</div>
                                        <div className="text-xs text-[var(--color-text-muted)] mt-0.5">${item.price}</div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-[var(--color-surface)] rounded-lg p-1">
                                        {/* Removing item completely on minus if quantity is 1 or just removing, since customization makes each unique usually */}
                                        <button onClick={() => {
                                            setCart(prev => prev.filter(p => p.unique_id !== item.unique_id))
                                        }} className="p-1 hover:bg-red-500/20 hover:text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                {/* Display Modifiers/Notes */}
                                {item.notes && (
                                    <div className="text-xs text-orange-400 bg-orange-500/10 p-1.5 rounded border border-orange-500/20">
                                        {item.notes}
                                    </div>
                                )}
                                {item.modifiers && item.modifiers.length > 0 && (
                                    <div className="text-xs text-[var(--color-text-muted)] pl-2 mt-1 border-l-2 border-white/10 space-y-0.5">
                                        {item.modifiers.map((m, idx) => (
                                            <div key={idx}>+ {m.name} x{m.quantity}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {cart.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-muted)] opacity-50 space-y-2">
                                <ShoppingCart className="w-12 h-12" />
                                <p>Agrega productos</p>
                            </div>
                        )}
                    </div>


                    {/* Footer Actions */}
                    <div className="p-6 bg-[var(--color-background)] border-t border-white/5 space-y-4">
                        <div className="flex justify-between text-2xl font-bold">
                            <span>Total</span>
                            <span>${cart.reduce((sum, i) => sum + (i.price * i.quantity), 0)}</span>
                        </div>

                        {processLoading ? (
                            <div className="w-full py-4 flex items-center justify-center gap-2 bg-white/5 rounded-xl animate-pulse">
                                <Loader2 className="animate-spin" /> Procesando...
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => handleCheckout('cash')}
                                    className="bg-green-600 hover:bg-green-500 hover:scale-[1.02] transition-all py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 disabled:opacity-50 disabled:hover:scale-100"
                                    disabled={cart.length === 0}
                                >
                                    <div className="flex items-center gap-2"><Banknote className="w-5 h-5" /> Efectivo</div>
                                </button>
                                <button
                                    onClick={() => handleCheckout('mercadopago')}
                                    className="bg-blue-600 hover:bg-blue-500 hover:scale-[1.02] transition-all py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 disabled:opacity-50 disabled:hover:scale-100"
                                    disabled={cart.length === 0}
                                >
                                    <div className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> MP / QR</div>
                                </button>
                                <button
                                    onClick={() => handleCheckout('transfer')}
                                    className="bg-purple-600 hover:bg-purple-500 hover:scale-[1.02] transition-all py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 disabled:opacity-50 disabled:hover:scale-100"
                                    disabled={cart.length === 0}
                                >
                                    <div className="flex items-center gap-2"><Banknote className="w-5 h-5" /> Transf.</div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Customization Modal */}
                <OrderModal
                    isOpen={!!customizingProduct}
                    onClose={() => setCustomizingProduct(null)}
                    initialProduct={customizingProduct}
                    onAddToCart={handleAddToCartFromModal}
                    isPOS={true}
                />
            </div>
        </div>
    )
}

export default POSModal
