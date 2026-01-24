import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, X, Loader2, Printer, Check } from 'lucide-react'
import { toast } from 'sonner'
import OrderModal from './OrderModal'
import DeliverySlotSelector from './checkout/DeliverySlotSelector'

const POSModal = ({ isOpen, onClose, onSuccess }) => {
    const [products, setProducts] = useState([])
    const [cart, setCart] = useState([])
    const [loading, setLoading] = useState(true)
    const [processLoading, setProcessLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [selectedCustomer, setSelectedCustomer] = useState(null)
    const [customerIdInput, setCustomerIdInput] = useState('')
    const [customerLoading, setCustomerLoading] = useState(false)
    const [customizingProduct, setCustomizingProduct] = useState(null) // Restored missing state

    // New: Schedule Slot
    const [selectedSlot, setSelectedSlot] = useState(null)
    const [orderType, setOrderType] = useState('takeaway') // 'takeaway' | 'delivery'
    const [deliveryAddress, setDeliveryAddress] = useState('')
    const [notes, setNotes] = useState('') // Notes state
    const [shippingCost, setShippingCost] = useState(0)
    const [deliverySettings, setDeliverySettings] = useState({ delivery_fixed_price: 0 })

    // Initial Load
    useEffect(() => {
        if (isOpen) {
            fetchProducts()
            // Reset session on open
            updateCustomerDisplay([], 'active')
            // Reset customer & slot
            setSelectedCustomer(null)
            setCustomerIdInput('')
            setCustomerIdInput('')
            setSelectedSlot(null)
            fetchSettings()
        } else {
            // Reset session on close to idle
            updateCustomerDisplay([], 'idle')
            setCart([])
            setSearchTerm('')
            setSelectedCustomer(null)
            setCustomerIdInput('')
            setSelectedSlot(null)
            setOrderType('takeaway')
            setDeliveryAddress('')
            setOrderType('takeaway')
            setDeliveryAddress('')
            setNotes('')
            setShippingCost(0)
        }
    }, [isOpen])


    // Realtime Sync to Customer Display
    useEffect(() => {
        if (isOpen) {
            const status = cart.length > 0 ? 'active' : 'active' // Keep active while modal is open basically
            updateCustomerDisplay(cart, status)
        }
    }, [cart])

    useEffect(() => {
        if (orderType === 'delivery') {
            if (deliverySettings.delivery_fixed_price > 0) {
                setShippingCost(deliverySettings.delivery_fixed_price)
            }
        } else {
            setShippingCost(0)
        }
    }, [orderType, deliverySettings])

    const fetchSettings = async () => {
        const { data } = await supabase.from('app_settings').select('*')
        if (data) {
            const settings = {}
            data.forEach(item => settings[item.key] = item.value)
            setDeliverySettings({
                delivery_fixed_price: parseFloat(settings.delivery_fixed_price || 0)
            })
        }
    }

    const fetchProducts = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('products')
            .select('*')
            .eq('is_available', true)

        if (data) setProducts(data)
        setLoading(false)
    }

    const handleCustomerSearch = async () => {
        if (!customerIdInput.trim()) {
            setSelectedCustomer(null)
            return
        }

        setCustomerLoading(true)
        // Search by numeric customer_id
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('customer_id', parseInt(customerIdInput))
            .single()

        setCustomerLoading(false)

        if (data) {
            setSelectedCustomer(data)
            if (data.address) setDeliveryAddress(data.address) // Pre-fill address
            toast.success(`Cliente identificado: ${data.full_name}`)
        } else {
            setSelectedCustomer(null)
            toast.error('Cliente no encontrado')
        }
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

    /* ... (Rest of logic) ... */
    const handleAddToCartFromModal = (customItem) => {
        setCart(prev => [...prev, customItem])
        setCustomizingProduct(null)
    }

    // ...

    const draftTimeoutRef = useRef(null)

    const handleDraftChange = (draft) => {
        if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current)

        draftTimeoutRef.current = setTimeout(() => {
            updateLiveDraft(draft)
        }, 300)
    }

    const updateLiveDraft = async (draft) => {
        // We only update if modal is open, otherwise clear it
        const payload = {
            current_action: draft,
            updated_at: new Date().toISOString()
        }

        await supabase
            .from('checkout_sessions')
            .update(payload)
            .eq('id', '00000000-0000-0000-0000-000000000000')
            .then()
    }

    // Clear draft on close or add
    useEffect(() => {
        if (!customizingProduct) {
            updateLiveDraft(null)
        }
    }, [customizingProduct])

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

            // 1. Create Order in DB
            // Use selectedCustomer.id if available (Juan Perez), otherwise null (Invitado)
            // Or if we want to attribute to Admin, we use userData. But usually orders are linked to the Customer.
            // If linked to Customer, Loyalty applies. 

            const { data: userData } = await supabase.auth.getUser()

            // Logic: If Customer Selected -> user_id = customer.id
            // If Guest -> user_id = null (Or maybe we keep tracking who CREATED it in a separate field? 
            // For now, let's assume user_id is the customer)

            const orderUserId = selectedCustomer ? selectedCustomer.id : null

            const orderPayload = {
                user_id: orderUserId,
                client_name: selectedCustomer ? selectedCustomer.full_name : 'Invitado', // Explicitly store name
                client_name: selectedCustomer ? selectedCustomer.full_name : 'Invitado', // Explicitly store name
                status: 'cooking', // POS orders bypass approval (cooking directly)
                total: subtotal + (orderType === 'delivery' ? Number(shippingCost) : 0),
                payment_method: method,
                order_type: orderType,
                payment_status: method === 'cash' ? 'paid' : 'pending', // MP is pending initially
                delivery_address: orderType === 'delivery'
                    ? (selectedCustomer?.address || deliveryAddress || 'Sin Dirección')
                    : 'Retiro en Local',
                scheduled_time: selectedSlot ? selectedSlot.start_time.slice(0, 5) : null
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

                // Print Detailed Ticket (Android) - Auto-print for POS
                if (window.AndroidPrint) {
                    const printPayload = {
                        id: orderData.id,
                        created_at: orderData.created_at,
                        updated_at: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
                        total: subtotal,
                        client_name: selectedCustomer ? selectedCustomer.full_name : 'Invitado',
                        client_address: orderType === 'delivery' ? (selectedCustomer?.address || deliveryAddress || '') : '',
                        client_phone: selectedCustomer?.phone || '',
                        client_shift: selectedSlot ? selectedSlot.start_time.slice(0, 5) : '',
                        delivery_time: selectedSlot ? selectedSlot.start_time.slice(0, 5) : '', // Explicit Label Support
                        order_type: orderType,
                        payment_method: 'cash',
                        cart_items: cart.map(item => ({
                            name: item.name,
                            quantity: item.quantity,
                            notes: item.notes,
                            modifiers: item.modifiers || [],
                            side_info: item.side_info,
                            drink_info: item.drink_info
                        }))
                    }
                    try {
                        window.AndroidPrint.printTicket(JSON.stringify(printPayload))
                        toast.success('Imprimiendo comanda... 🖨️')
                    } catch (e) {
                        console.error('Error sending to printer:', e)
                    }
                }

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

    // Derived Categories
    const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))]

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
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            Nuevo Pedido
                            <button
                                onClick={() => checkPrinterStatus()}
                                className="bg-white/5 hover:bg-white/10 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-white transition-colors"
                                title="Verificar Impresora"
                            >
                                <span className="sr-only">Verificar Impresora</span>
                                <Printer className="w-4 h-4" />
                            </button>
                        </h2>
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

                        {/* CUSTOMER ID INPUT */}
                        <div className="hidden md:flex items-center gap-2 pl-4 border-l border-white/5">
                            <div className="relative w-24">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-xs font-mono">#</span>
                                <input
                                    type="text"
                                    placeholder="ID"
                                    className="w-full bg-[var(--color-background)] rounded-xl py-2.5 pl-7 pr-2 text-sm outline-none focus:ring-1 ring-[var(--color-primary)] transition-all font-mono"
                                    value={customerIdInput}
                                    onChange={e => setCustomerIdInput(e.target.value)}
                                    onBlur={handleCustomerSearch}
                                    onKeyDown={e => e.key === 'Enter' && handleCustomerSearch()}
                                />
                            </div>
                            {selectedCustomer ? (
                                <div className="bg-green-500/10 text-green-400 px-3 py-1.5 rounded-lg text-sm font-bold truncate max-w-[150px]">
                                    {selectedCustomer.full_name}
                                </div>
                            ) : (
                                <div className="text-[var(--color-text-muted)] text-sm px-2">
                                    Invitado
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Category Tabs */}
                    <div className="px-6 py-3 border-b border-white/5 flex gap-2 overflow-x-auto custom-scrollbar whitespace-nowrap">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${selectedCategory === cat
                                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20'
                                    : 'bg-[var(--color-surface)] border-white/10 text-[var(--color-text-muted)] hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                {cat === 'all' ? 'Todos' : cat}
                            </button>
                        ))}
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
                    <div className="p-6 border-b border-white/5 flex flex-col gap-4">
                        <div className="font-bold text-lg flex items-center justify-between">
                            <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Carrito</span>
                        </div>

                        {/* Order Type Toggle - Large */}
                        <div className="grid grid-cols-2 gap-2 bg-black/20 p-1 rounded-xl">
                            <button
                                onClick={() => setOrderType('takeaway')}
                                className={`py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${orderType === 'takeaway' ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'text-[var(--color-text-muted)] hover:bg-white/5'}`}
                            >
                                <span className={orderType === 'takeaway' ? 'block' : 'hidden md:block'}>🏪</span> Retiro
                            </button>
                            <button
                                onClick={() => setOrderType('delivery')}
                                className={`py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${orderType === 'delivery' ? 'bg-blue-600 text-white shadow-lg' : 'text-[var(--color-text-muted)] hover:bg-white/5'}`}
                            >
                                <span className={orderType === 'delivery' ? 'block' : 'hidden md:block'}>🛵</span> Delivery
                            </button>
                        </div>

                        {/* Delivery Address Input */}
                        {orderType === 'delivery' && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-2">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={deliveryAddress}
                                        onChange={(e) => setDeliveryAddress(e.target.value)}
                                        placeholder="Dirección de envío..."
                                        className="flex-1 bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                                    />
                                    <button
                                        onClick={() => setDeliveryAddress('')}
                                        className="bg-white/5 hover:bg-white/10 text-[var(--color-text-muted)] hover:text-white px-3 py-2 rounded-lg text-xs font-bold border border-white/10 transition-colors whitespace-nowrap"
                                    >
                                        Otro domicilio
                                    </button>
                                </div>
                                {selectedCustomer && selectedCustomer.address && (
                                    <div className="flex justify-between items-center px-1">
                                        <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                                            <Check size={12} className="text-green-500" />
                                            <span className="truncate max-w-[150px]" title={selectedCustomer.address}>
                                                Registrada: {selectedCustomer.address}
                                            </span>
                                        </div>
                                        {deliveryAddress !== selectedCustomer.address && (
                                            <button
                                                onClick={() => setDeliveryAddress(selectedCustomer.address)}
                                                className="text-xs text-white hover:text-white/80 hover:underline font-medium"
                                            >
                                                Usar domicilio original
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Time Slot Selector */}
                        <div className="w-full">
                            <DeliverySlotSelector
                                orderType={orderType}
                                selectedSlot={selectedSlot}
                                onSlotSelect={setSelectedSlot}
                                compact={true}
                            />
                        </div>

                        {/* Shipping Cost Input (Manual Override) */}
                        {orderType === 'delivery' && (
                            <div className="w-full animate-in fade-in zoom-in-50 duration-200">
                                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Costo de Envío</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">$</span>
                                    <input
                                        type="number"
                                        value={shippingCost}
                                        onChange={(e) => setShippingCost(Number(e.target.value))}
                                        className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)] font-bold"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Notes Input */}
                        <div className="w-full pt-2 border-t border-white/5">
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Notas u observaciones (ej: Sin sal, timbre no anda...)"
                                className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)] resize-none"
                                rows={2}
                            />
                        </div>
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
                            <span>${cart.reduce((sum, i) => sum + (i.price * i.quantity), 0) + (orderType === 'delivery' ? Number(shippingCost) : 0)}</span>
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
                    onDraftChange={handleDraftChange}
                    isPOS={true}
                />
            </div>
        </div>
    )
}

export default POSModal
