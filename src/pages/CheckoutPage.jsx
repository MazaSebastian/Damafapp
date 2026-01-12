import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useCart } from '../context/CartContext'
import { supabase } from '../supabaseClient'
import { ArrowLeft, Trash2, ShoppingBag, Plus, CreditCard, MapPin, Store, Utensils, Ticket } from 'lucide-react'

const CheckoutPage = () => {
    const { cart, removeFromCart, total, clearCart } = useCart()
    const navigate = useNavigate()

    const [orderType, setOrderType] = useState(null)
    const [address, setAddress] = useState('')
    const [couponCode, setCouponCode] = useState('')
    const [appliedCoupon, setAppliedCoupon] = useState(null)
    const [discountAmount, setDiscountAmount] = useState(0)

    const applyCoupon = async () => {
        if (!couponCode) return

        const { data: validCoupon, error } = await supabase
            .from('coupons')
            .select('*, products(name, price)')
            .eq('code', couponCode.toUpperCase())
            .single()

        if (error || !validCoupon || !validCoupon.is_active) {
            toast.error('Cupón inválido o expirado')
            setAppliedCoupon(null)
            setDiscountAmount(0)
            return
        }

        if (validCoupon.usage_limit && validCoupon.usage_count >= validCoupon.usage_limit) {
            toast.error('Este cupón ha alcanzado su límite de usos')
            return
        }

        // Calculate discount
        let discount = 0
        if (validCoupon.discount_type === 'percentage') {
            discount = (total * validCoupon.value) / 100
        } else if (validCoupon.discount_type === 'fixed') {
            discount = validCoupon.value
        } else if (validCoupon.discount_type === 'product') {
            // Find if product is in cart (assuming 'target_product_id' is the free product)
            // Note: Simplification - we just deduct the product price if it's in the cart, 
            // or maybe we should add it? For now, let's assume user must add it first, OR we discount the value of that product.
            /* 
               Valid logic: If coupon grants a free product, we look for that product in the cart.
               If found, we discount its price. If not found, we alert user to add it?
               Let's try: Discount max 1 instance of that product price.
            */
            // We need to fetch product price if not in Join, but we included it in query
            // wait, we need to check if product is in cart.
            const productInCart = cart.find(item => item.main.id === validCoupon.target_product_id)
            if (productInCart) {
                discount = productInCart.main.price
            } else {
                toast.info(`Este cupón te regala un ${validCoupon.products?.name || 'producto'}. ¡Si no está en el carrito, agrégalo para ver el descuento!`)
                return
            }
        }

        if (discount > total) discount = total

        setAppliedCoupon(validCoupon)
        setDiscountAmount(discount)
        toast.success(`¡Cupón ${validCoupon.code} aplicado! Ahorras $${discount.toFixed(2)}`)
    }

    const finalTotal = total - discountAmount

    // Initialize Mercado Pago
    import { initMercadoPago } from '@mercadopago/sdk-react'

    // Replace with your Public Key (or use environment variable)
    // For development, we can check if the env var exists, otherwise use a placeholder or handle gracefully.
    const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY
    if (MP_PUBLIC_KEY) {
        initMercadoPago(MP_PUBLIC_KEY)
    }

    const handleCheckout = async () => {
        if (!orderType) {
            toast.warning('Por favor selecciona: DELIVERY o RETIRO EN LOCAL')
            return
        }

        if (orderType === 'delivery' && !address.trim()) {
            toast.error('Por favor ingresa tu dirección de envío')
            return
        }

        if (!confirm('¿Confirmar pedido por $' + finalTotal.toFixed(2) + ' y pagar con Mercado Pago?')) return

        const { data: { user } } = await supabase.auth.getUser()

        try {
            // 1. Create Order
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    user_id: user?.id || null,
                    total: finalTotal,
                    status: 'pending_payment', // New initial status
                    order_type: orderType,
                    delivery_address: orderType === 'delivery' ? address : null,
                    coupon_code: appliedCoupon?.code || null,
                    discount_amount: discountAmount
                }])
                .select()
                .single()

            if (orderError) throw orderError

            // 2. Create Order Items
            const orderItems = cart.map(item => ({
                order_id: order.id,
                product_id: item.main.id,
                quantity: 1,
                price_at_time: item.main.price,
                modifiers: item.modifiers || [],
                side_info: item.side ? { id: item.side.id, name: item.side.name, price: item.side.price } : null,
                drink_info: item.drink ? { id: item.drink.id, name: item.drink.name, price: item.drink.price } : null
            }))

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems)

            if (itemsError) throw itemsError

            // 3. Call Edge Function to get Mercado Pago Preference
            toast.loading('Generando link de pago...')

            const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment-preference', {
                body: { order_id: order.id }
            })

            if (paymentError || !paymentData?.init_point) {
                console.error('Payment Error:', paymentError)
                throw new Error('Error al conectar con Mercado Pago')
            }

            // 4. Redirect to Mercado Pago
            window.location.href = paymentData.init_point

        } catch (error) {
            console.error(error)
            toast.dismiss() // Dismiss loading toast
            toast.error('Ocurrió un error al procesar el pedido: ' + error.message)
        }
    }

    if (cart.length === 0) {
        return (
            <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-center p-4 text-center">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                    <ShoppingBag className="w-10 h-10 text-[var(--color-text-muted)]" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Tu pedido está vacío</h2>
                <p className="text-[var(--color-text-muted)] mb-8">¡Hora de buscar algo delicioso!</p>
                <Link to="/menu" className="bg-[var(--color-secondary)] text-white px-8 py-3 rounded-full font-bold hover:bg-orange-600 transition-colors">
                    Ir al Menú
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[var(--color-background)] pb-40">
            <header className="p-4 flex items-center sticky top-0 bg-[var(--color-background)]/90 backdrop-blur-md z-40 border-b border-white/5">
                <Link to="/menu" className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="ml-2 font-bold text-lg">Tu Pedido</h1>
            </header>

            <main className="p-4 max-w-lg mx-auto space-y-4">
                {cart.map((item, index) => (
                    <div key={item.id} className="bg-[var(--color-surface)] rounded-2xl p-4 border border-white/5 animated-slide-up" style={{ animationDelay: `${index * 100}ms` }}>

                        {/* Main Item */}
                        <div className="flex gap-4 mb-3">
                            {item.main.media_type === 'video' ? (
                                <video src={item.main.image_url} className="w-16 h-16 rounded-lg object-cover bg-black/20" muted loop autoPlay playsInline />
                            ) : (
                                <img src={item.main.image_url} className="w-16 h-16 rounded-lg object-cover bg-black/20" />
                            )}
                            <div className="flex-1">
                                <h3 className="font-bold text-lg leading-tight">{item.main.name}</h3>
                                <p className="text-[var(--color-secondary)] font-bold">${item.main.price}</p>
                            </div>
                            <button onClick={() => removeFromCart(item.id)} className="self-start text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Details */}
                        <div className="pl-4 border-l-2 border-white/10 space-y-1 text-sm text-[var(--color-text-muted)]">
                            {item.modifiers?.map(mod => (
                                <div key={mod.id} className="flex justify-between">
                                    <span>• {mod.name}</span>
                                    {mod.price > 0 && <span>+${mod.price}</span>}
                                </div>
                            ))}
                            {item.side && (
                                <div className="flex justify-between text-white/80">
                                    <span>+ {item.side.name}</span>
                                    <span>+${item.side.price}</span>
                                </div>
                            )}
                            {item.drink && (
                                <div className="flex justify-between text-white/80">
                                    <span>+ {item.drink.name}</span>
                                    <span>+${item.drink.price}</span>
                                </div>
                            )}
                        </div>

                    </div>
                ))}

                <button
                    onClick={() => navigate('/menu')}
                    className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center gap-2 text-[var(--color-text-muted)] hover:border-[var(--color-secondary)] hover:text-[var(--color-secondary)] transition-all font-bold"
                >
                    <Plus className="w-5 h-5" />
                    Agregar otro pedido
                </button>
            </main>

            {/* Delivery Footer */}
            <div className="fixed bottom-0 w-full bg-[var(--color-surface)] border-t border-white/5 p-6 z-50 rounded-t-3xl shadow-2xl">
                <div className="max-w-lg mx-auto space-y-4">

                    {/* Delivery Toggle */}
                    <div className="bg-[var(--color-background)] p-1 rounded-xl flex">
                        <button
                            onClick={() => setOrderType('takeaway')}
                            className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${orderType === 'takeaway' ? 'bg-[var(--color-secondary)] text-white shadow-lg' : 'text-[var(--color-text-muted)]'}`}
                        >
                            Retiro en Local
                        </button>
                        <button
                            onClick={() => setOrderType('delivery')}
                            className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${orderType === 'delivery' ? 'bg-[var(--color-secondary)] text-white shadow-lg' : 'text-[var(--color-text-muted)]'}`}
                        >
                            Delivery
                        </button>
                    </div>

                    {/* Address Input */}
                    {orderType === 'delivery' && (
                        <div className="animated-slide-up">
                            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-2">Dirección de Envío</label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Calle, Número, Piso..."
                                className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[var(--color-secondary)]"
                            />
                        </div>
                    )}

                    {/* Coupon Input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="Código de descuento"
                            className="flex-1 bg-[var(--color-background)] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[var(--color-secondary)] uppercase"
                            disabled={!!appliedCoupon}
                        />
                        {appliedCoupon ? (
                            <button onClick={() => { setAppliedCoupon(null); setDiscountAmount(0); setCouponCode('') }} className="bg-red-500/10 text-red-500 px-4 rounded-xl font-bold">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        ) : (
                            <button onClick={applyCoupon} className="bg-[var(--color-primary)] text-white px-6 rounded-xl font-bold">
                                Aplicar
                            </button>
                        )}
                    </div>
                    {appliedCoupon && (
                        <div className="text-green-400 text-sm font-bold flex justify-between">
                            <span>Cupón aplicado ({appliedCoupon.code})</span>
                            <span>-${discountAmount.toFixed(2)}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-end pt-2 border-t border-white/5">
                        <span className="text-[var(--color-text-muted)] font-medium">Total a Pagar</span>
                        <div className="text-right">
                            {appliedCoupon && <span className="block text-sm text-[var(--color-text-muted)] line-through">${total.toFixed(2)}</span>}
                            <span className="text-3xl font-bold text-white">${finalTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    <button onClick={handleCheckout} className={`w-full text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all
                        ${!orderType ? 'bg-gray-600 cursor-not-allowed opacity-50' : 'bg-[#009ee3] hover:bg-[#009ee3]/90 shadow-blue-900/20'}`}>
                        {orderType === 'delivery' ? 'Pagar con Mercado Pago' :
                            orderType === 'takeaway' ? 'Pagar Retiro con MP' :
                                'Seleccione método de entrega'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CheckoutPage
