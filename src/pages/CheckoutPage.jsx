
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import { ArrowLeft, Trash2, MapPin, Car, Info, AlertTriangle, Play, Pause, RotateCcw, Plus, ShoppingBag } from 'lucide-react'
import { initMercadoPago } from '@mercadopago/sdk-react'
import DeliveryMap from '../components/DeliveryMap'
import { useStoreStatus } from '../hooks/useStoreStatus'
import OrderConfirmationModal from '../components/OrderConfirmationModal'
import OrderModal from '../components/OrderModal'
import DeliverySlotSelector from '../components/checkout/DeliverySlotSelector'

import OrderApprovalModal from '../components/checkout/OrderApprovalModal'

const CheckoutPage = () => {
    const navigate = useNavigate()
    const { cart, removeFromCart, total, clearCart } = useCart()
    const { user, refreshProfile } = useAuth()
    const { isOpen, loading: statusLoading } = useStoreStatus()
    const [loading, setLoading] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState('mercadopago') // 'mercadopago' | 'cash'

    const [orderType, setOrderType] = useState('takeaway')
    const [address, setAddress] = useState('')
    const [deliveryCoords, setDeliveryCoords] = useState(null) // { lat, lng }
    const [couponCode, setCouponCode] = useState('')
    const [appliedCoupon, setAppliedCoupon] = useState(null)
    const [discountAmount, setDiscountAmount] = useState(0)
    const [checkingCoupon, setCheckingCoupon] = useState(false)
    const [showAddOrderModal, setShowAddOrderModal] = useState(false)

    // New State for Delivery
    const [shippingCost, setShippingCost] = useState(0)
    const [distanceKm, setDistanceKm] = useState(0)
    const [selectedSlot, setSelectedSlot] = useState(null)

    // Dynamic Delivery Settings State
    const [deliverySettings, setDeliverySettings] = useState({
        store_lat: -34.530019, // Default fallback (Carapachay)
        store_lng: -58.542822,
        delivery_price_per_km: 500,
        delivery_free_range_km: 0
    })

    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase.from('app_settings').select('*')
            if (data) {
                const newSettings = {}
                data.forEach(item => {
                    newSettings[item.key] = item.value
                })

                setDeliverySettings(prev => ({
                    ...prev,
                    ...newSettings,
                    // Parse numbers safely
                    store_lat: parseFloat(newSettings.store_lat || prev.store_lat),
                    store_lng: parseFloat(newSettings.store_lng || prev.store_lng),
                    delivery_price_per_km: parseFloat(newSettings.delivery_price_per_km || prev.delivery_price_per_km),
                    delivery_free_range_km: parseFloat(newSettings.delivery_free_range_km || prev.delivery_free_range_km),
                }))
            }
        }
        fetchSettings()
    }, [])

    const applyCoupon = async () => {
        if (!couponCode) return

        // New Restriction: Check if user is logged in (actually we need to check auth state here)
        // Since useAuth is not imported in this file yet (wait, let me check viewed content),
        // Ah, CheckoutPage.jsx does NOT import useAuth. I need to import it.
        // For now, I will use supabase.auth.getUser() which is already imported/available or use local check.

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            toast.error('Debes iniciar sesión para usar cupones')
            return
        }

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
        toast.success(`¡Cupón ${validCoupon.code} aplicado! Ahorras $${discount.toFixed(2)} `)
    }

    // Shipping Logic
    const handleDistanceCalculated = (distance) => {
        setDistanceKm(distance)
        let cost = 0

        // Check for Free Shipping Radius
        if (deliverySettings.delivery_free_range_km > 0 && distance <= deliverySettings.delivery_free_range_km) {
            cost = 0
            toast.success('¡Estás dentro del rango de envío GRATIS! 🎉')
        } else {
            // Dynamic Cost per KM
            cost = Math.ceil(distance * deliverySettings.delivery_price_per_km)
            toast.info(`Distancia: ${distance.toFixed(1)} km - Envío: $${cost} `)
        }

        setShippingCost(cost)
    }

    const handleAddressSelected = (data) => {
        // Handle both string (legacy/direct input) and object (from Map)
        if (typeof data === 'string') {
            setAddress(data)
        } else if (data && typeof data === 'object') {
            setAddress(data.address)
            setDeliveryCoords({ lat: data.lat, lng: data.lng })
        }
    }

    const finalTotal = total - discountAmount + (orderType === 'delivery' ? shippingCost : 0)

    // Initialize Mercado Pago
    const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY
    if (MP_PUBLIC_KEY) {
        initMercadoPago(MP_PUBLIC_KEY)
    }

    // Approval Flow State
    const [showApprovalModal, setShowApprovalModal] = useState(false)
    const [pendingOrderId, setPendingOrderId] = useState(null)

    const processOrder = async () => {
        const { data: { user } } = await supabase.auth.getUser()

        try {
            // 1. Create Order
            // IF Mercado Pago -> Set status to 'pending_approval' to trigger Wait Flow
            const initialStatus = paymentMethod === 'mercadopago' ? 'pending_approval' : 'pending'

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    user_id: user?.id || null,
                    total: finalTotal,
                    status: initialStatus,
                    order_type: orderType,
                    payment_method: paymentMethod,
                    delivery_address: orderType === 'delivery' ? address : null,
                    delivery_lat: (orderType === 'delivery' && deliveryCoords) ? deliveryCoords.lat : null,
                    delivery_lng: (orderType === 'delivery' && deliveryCoords) ? deliveryCoords.lng : null,
                    coupon_code: appliedCoupon?.code || null,
                    discount_amount: discountAmount,
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

            // Save order locally if guest
            if (!user) {
                const currentGuestOrders = JSON.parse(localStorage.getItem('damaf_guest_orders') || '[]')

                const fullGuestOrder = {
                    ...order,
                    order_items: cart.map(item => ({
                        id: Math.random().toString(), // temp id
                        products: {
                            name: item.main.name,
                            image_url: item.main.image_url
                        },
                        modifiers: item.modifiers,
                        side_info: item.side,
                        quantity: 1
                    }))
                }

                localStorage.setItem('damaf_guest_orders', JSON.stringify([fullGuestOrder, ...currentGuestOrders]))
            }

            // 3. Handle Payment Flow
            if (paymentMethod === 'mercadopago') {
                // NEW FLOW: Show Approval Modal and Wait
                setPendingOrderId(order.id)
                setShowApprovalModal(true)
                // Payment generation is deferred until onApproved callback
            } else {
                // CASH OR TRANSFER FLOW -> WHATSAPP REDIRECT
                redirectToWhatsApp(order)
            }

        } catch (error) {
            console.error(error)
            toast.dismiss()
            toast.error('Ocurrió un error al procesar el pedido: ' + error.message)
        }
    }

    const proceedToMercadoPago = async (orderId) => {
        try {
            toast.loading('Generando link de pago...')

            const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment-preference', {
                body: { order_id: orderId }
            })

            if (paymentError) {
                console.error('Supabase Function Error:', paymentError)
                throw new Error('Error al conectar con Mercado Pago')
            }

            if (!paymentData?.init_point) {
                throw new Error('No se recibió el link de pago')
            }

            window.location.href = paymentData.init_point
        } catch (error) {
            toast.dismiss()
            toast.error('Error: ' + error.message)
            setShowApprovalModal(false)
        }
    }

    const redirectToWhatsApp = (order) => {
        const waNumber = deliverySettings.store_phone || '5491100000000' // Fallback
        const waTemplate = deliverySettings.store_whatsapp_template ||
            "Hola! Quiero confirmar mi pedido *#{{id}}* 🍔\n\n📅 *Fecha:* {{fecha}}\n👤 *Cliente:* {{cliente}}\n📍 *Entrega:* {{entrega}}\n💵 *Pago:* {{pago}}\n\n📝 *Pedido:*\n{{items}}\n\n💰 *Total a Pagar:* ${{total}}"

        const orderDate = new Date().toLocaleDateString()
        const customerName = user?.user_metadata?.name || 'Invitado'
        const deliveryInfo = orderType === 'delivery' ? `Delivery (${address})` : 'Retiro en Local'
        const paymentInfo = paymentMethod === 'transfer' ? 'Transferencia Bancaria' : 'Efectivo'

        let itemsList = ''
        cart.forEach(item => {
            itemsList += `- ${item.main.name} x1`
            if (item.modifiers?.length) itemsList += ` (${item.modifiers.map(m => m.name).join(', ')})`
            itemsList += '\n'
        })

        let message = waTemplate
            .replace(/\\n/g, '\n')
            .replace('{{id}}', order.id.slice(0, 8))
            .replace('{{fecha}}', orderDate)
            .replace('{{cliente}}', customerName)
            .replace('{{entrega}}', deliveryInfo)
            .replace('{{pago}}', paymentInfo)
            .replace('{{items}}', itemsList)
            .replace('{{total}}', finalTotal)

        if (paymentMethod === 'transfer' && !message.includes('datos bancarios')) {
            message += `\n\nℹ️ *Solicito datos bancarios para transferir.*`
        }

        const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`

        toast.success(paymentMethod === 'transfer' ? 'Abriendo WhatsApp para coordinar pago...' : 'Abriendo WhatsApp para confirmar...')
        clearCart()

        setTimeout(() => {
            window.location.href = waUrl
        }, 1000)
    }

    // SIMULATION FOR TESTING (TRIGGER BUILD)
    const simulatePayment = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            toast.error('Debes iniciar sesión para simular')
            return
        }

        try {
            toast.loading('Simulando pago...')
            // 1. Create Order as PENDING first
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    user_id: user.id,
                    total: finalTotal,
                    status: 'pending', // Visible in 'En Proceso'
                    order_type: orderType,
                    delivery_address: orderType === 'delivery' ? address : null,
                    coupon_code: appliedCoupon?.code || null,
                    discount_amount: discountAmount,
                }])
                .select()
                .single()

            if (orderError) throw orderError

            // 2. Insert Items
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

            // 3. Manually Update Stars (Simulation Only)
            // Trigger only works on 'completed', but we want order in Active.
            // We manually award stars here for the user experience.
            const starsToAdd = Math.floor(finalTotal / 100)
            if (starsToAdd > 0) {
                // Try updating profile directly (requires RLS policy or admin role)
                // Or we rely on verify that simulation is usually 'completed' flow.
                // But user wants "Active" order flow AND stars.
                // We'll update the profile directly. If RLS fails, we log it.
                const { error: starError } = await supabase.rpc('increment_stars', { amount: starsToAdd })

                // If RPC fails (doesn't exist), try direct update if policies allow
                if (starError) {
                    // Fallback: This assumes the user CAN update their own stars, which is insecure but might be allowed in this dev setup
                    // based on previous SQL files disabling RLS.
                    const { data: profile } = await supabase.from('profiles').select('stars').eq('id', user.id).single()
                    if (profile) {
                        await supabase.from('profiles').update({ stars: (profile.stars || 0) + starsToAdd }).eq('id', user.id)
                    }
                }
            }

            // Refresh Profile to get new stars
            await refreshProfile()

            toast.dismiss()
            toast.success('Pedido pagado correctamente, en breve estaras disfrutando de tu burga! 🍔')

            clearCart()
            navigate('/')

        } catch (error) {
            console.error('Error simulando:', error)
            toast.dismiss()
            toast.error('Error al simular: ' + error.message)
        }
    }

    const handleCheckout = async () => {
        if (!orderType) {
            toast.warning('Por favor selecciona: DELIVERY o RETIRO EN LOCAL')
            return
        }

        if (orderType === 'delivery' && !address.trim()) {
            toast.error('Por favor confirma tu ubicación en el mapa')
            return
        }

        if (orderType === 'delivery' && shippingCost === 0 && distanceKm === 0) {
            toast.error('Calculando costo de envío, por favor espera...')
            return
        }

        if (!selectedSlot) {
            toast.error('Por favor selecciona un HORARIO de entrega/retiro')
            return
        }

        // Check if Cash Register is OPEN (Blocker)
        // User Request: "No se pueden recibir pedidos sin haber abierto la caja"
        // We use an RPC call to bypass RLS, ensuring guests can check this too.
        const { data: isOpen, error: rpcError } = await supabase.rpc('is_register_open')

        if (rpcError) {
            console.error('Error referencing register status:', rpcError)
            // If RPC fails (e.g. not created yet), we might fall back or allow. 
            // But for safety, let's log and assume closed if strict, OR allow if lenient.
            // Given the request, we block.
        }

        if (!isOpen) {
            toast.error('Lo sentimos, el local no ha abierto caja aún. Intenta nuevamente en unos minutos.', {
                duration: 5000,
            })
            return
        }

        // Custom Toast Confirmation - REPLACED BY MODAL
        setShowConfirmModal(true)
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
        <div className="min-h-screen bg-[var(--color-background)] pb-64">
            <header className="p-4 flex items-center sticky top-0 bg-[var(--color-background)]/90 backdrop-blur-md z-40 border-b border-white/5">
                <Link to="/menu" className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="ml-2 font-bold text-lg">Tu Pedido</h1>
            </header>

            <main className="p-4 max-w-lg mx-auto space-y-6">

                {/* Delivery Toggle (Moved to Main) */}
                <div className="bg-[var(--color-surface)] p-1 rounded-xl flex border border-white/5">
                    <button
                        onClick={() => { setOrderType('takeaway'); setShippingCost(0); setSelectedSlot(null); }}
                        className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${orderType === 'takeaway' ? 'bg-[var(--color-secondary)] text-white shadow-lg' : 'text-[var(--color-text-muted)]'}`}
                    >
                        Retiro en Local
                    </button>
                    <button
                        onClick={() => { setOrderType('delivery'); setSelectedSlot(null); }}
                        className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${orderType === 'delivery' ? 'bg-[var(--color-secondary)] text-white shadow-lg' : 'text-[var(--color-text-muted)]'}`}
                    >
                        Delivery
                    </button>
                </div>

                {/* SLOT SELECTOR */}
                <div className="animated-slide-up">
                    <p className="text-sm text-[var(--color-text-muted)] mb-2 font-medium">Selecciona Horario:</p>
                    <DeliverySlotSelector
                        orderType={orderType}
                        selectedSlot={selectedSlot}
                        onSlotSelect={setSelectedSlot}
                    />
                </div>

                {/* Map Integration (Moved to Main) */}
                {orderType === 'delivery' && (
                    <div className="animated-slide-up space-y-2">
                        <div className="bg-orange-500/10 text-orange-400 p-3 rounded-lg text-sm mb-2 border border-orange-500/20">
                            📍 Selecciona tu ubicación exacta en el mapa
                        </div>
                        <DeliveryMap
                            storeLocation={{
                                lat: deliverySettings.store_lat,
                                lng: deliverySettings.store_lng
                            }}
                            onDistanceCalculated={handleDistanceCalculated}
                            onAddressSelected={handleAddressSelected}
                        />
                        {distanceKm > 0 && (
                            <div className="flex justify-between items-center text-sm px-2 bg-[var(--color-surface)] p-3 rounded-xl border border-white/5">
                                <span className="text-[var(--color-text-muted)] flex items-center gap-1">
                                    <MapPin className="w-4 h-4" /> {distanceKm.toFixed(1)} km
                                </span>
                                <span className="text-[var(--color-secondary)] font-bold flex items-center gap-1">
                                    <Car className="w-4 h-4" /> Envío: ${shippingCost}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* List Items */}
                <div className="space-y-4">
                    {cart.map((item, index) => (
                        <div key={item.id} className="bg-[var(--color-surface)] rounded-2xl p-4 border border-white/5 animated-slide-up" style={{ animationDelay: `${index * 100} ms` }}>
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
                </div>

                <button
                    onClick={() => setShowAddOrderModal(true)}
                    className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center gap-2 text-[var(--color-text-muted)] hover:border-[var(--color-secondary)] hover:text-[var(--color-secondary)] transition-all font-bold"
                >
                    <Plus className="w-5 h-5" />
                    Agregar otro pedido
                </button>
            </main>

            {/* Delivery Footer - Only Coupon, Total & Pay */}
            <div className="fixed bottom-0 w-full bg-[var(--color-surface)]/95 backdrop-blur-xl border-t border-white/5 p-6 z-50 rounded-t-3xl shadow-2xl">
                <div className="max-w-lg mx-auto space-y-4">

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

                    {/* Payment Method Selector */}
                    <div className="bg-[var(--color-background)] p-1 rounded-xl flex border border-white/10 mb-2">
                        <button
                            onClick={() => setPaymentMethod('mercadopago')}
                            className={`flex-1 py-3 rounded-lg font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 ${paymentMethod === 'mercadopago' ? 'bg-[#009ee3] text-white shadow-lg' : 'text-[var(--color-text-muted)]'}`}
                        >
                            <span>💳 Mercado Pago</span>
                        </button>
                        <button
                            onClick={() => setPaymentMethod('transfer')}
                            className={`flex-1 py-3 rounded-lg font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 ${paymentMethod === 'transfer' ? 'bg-purple-600 text-white shadow-lg' : 'text-[var(--color-text-muted)]'}`}
                        >
                            <span>🏦 Transferencia</span>
                        </button>
                        <button
                            onClick={() => setPaymentMethod('cash')}
                            className={`flex-1 py-3 rounded-lg font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 ${paymentMethod === 'cash' ? 'bg-green-600 text-white shadow-lg' : 'text-[var(--color-text-muted)]'}`}
                        >
                            <span>💵 Efectivo</span>
                        </button>
                    </div>

                    <button onClick={handleCheckout} className={`w-full text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all
                        ${!orderType ? 'bg-gray-600 cursor-not-allowed opacity-50' :
                            paymentMethod === 'mercadopago' ? 'bg-[#009ee3] hover:bg-[#009ee3]/90 shadow-blue-900/20' :
                                paymentMethod === 'transfer' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20' :
                                    'bg-green-600 hover:bg-green-500 shadow-green-900/20'}`}>
                        {orderType === 'delivery' ?
                            (paymentMethod === 'mercadopago' ? 'Solicitar y Pagar con MP' : paymentMethod === 'transfer' ? 'Confirmar (Transferencia)' : 'Confirmar (Efectivo)') :
                            (paymentMethod === 'mercadopago' ? 'Solicitar Retiro con MP' : paymentMethod === 'transfer' ? 'Confirmar (Transferencia)' : 'Confirmar (Efectivo)')
                        }
                    </button>
                </div>
            </div>

            {/* Modals */}
            <OrderConfirmationModal
                isOpen={showConfirmModal}
                orderData={{
                    total: finalTotal, // Use finalTotal here
                    type: orderType,
                    items: cart,
                    address: address, // Pass address
                    customerName: user?.user_metadata?.name || 'Cliente',
                    customerPhone: user?.phone || '', // User phone if available
                    paymentMethod: paymentMethod === 'mercadopago' ? 'Mercado Pago' : paymentMethod === 'transfer' ? 'Transferencia' : 'Efectivo'
                }}
                onConfirm={() => {
                    setShowConfirmModal(false)
                    processOrder()
                }}
                onClose={() => setShowConfirmModal(false)}
            />

            <OrderModal
                isOpen={showAddOrderModal}
                onClose={() => setShowAddOrderModal(false)}
            />

            <OrderApprovalModal
                isOpen={showApprovalModal}
                orderId={pendingOrderId}
                onClose={() => setShowApprovalModal(false)}
                onApproved={() => proceedToMercadoPago(pendingOrderId)}
                onRejected={() => {
                    setShowApprovalModal(false)
                    toast.error('Tu pedido ha sido rechazado por el local.')
                    setPendingOrderId(null)
                }}
            />

            {/* DEV TOOL: Simulation Button */}
            <div className="fixed top-20 right-4 z-50">
                <button
                    onClick={simulatePayment}
                    className="bg-purple-600 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-lg opacity-50 hover:opacity-100 transition-opacity flex items-center gap-1"
                >
                    🛠 Simular Pago
                </button>
            </div>

        </div >
    )
}

export default CheckoutPage

// SIMULATION FOR TESTING (TRIGGER BUILD)
const simulatePayment = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        toast.error('Debes iniciar sesión para simular')
        return
    }

    try {
        toast.loading('Simulando pago...')
        // 1. Create Order as PENDING first
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([{
                user_id: user.id,
                total: finalTotal,
                status: 'pending', // Visible in 'En Proceso'
                order_type: orderType,
                delivery_address: orderType === 'delivery' ? address : null,
                coupon_code: appliedCoupon?.code || null,
                discount_amount: discountAmount,
            }])
            .select()
            .single()

        if (orderError) throw orderError

        // 2. Insert Items
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

        // 3. Manually Update Stars (Simulation Only)
        // Trigger only works on 'completed', but we want order in Active.
        // We manually award stars here for the user experience.
        const starsToAdd = Math.floor(finalTotal / 100)
        if (starsToAdd > 0) {
            // Try updating profile directly (requires RLS policy or admin role)
            // Or we rely on verify that simulation is usually 'completed' flow.
            // But user wants "Active" order flow AND stars.
            // We'll update the profile directly. If RLS fails, we log it.
            const { error: starError } = await supabase.rpc('increment_stars', { amount: starsToAdd })

            // If RPC fails (doesn't exist), try direct update if policies allow
            if (starError) {
                // Fallback: This assumes the user CAN update their own stars, which is insecure but might be allowed in this dev setup
                // based on previous SQL files disabling RLS.
                const { data: profile } = await supabase.from('profiles').select('stars').eq('id', user.id).single()
                if (profile) {
                    await supabase.from('profiles').update({ stars: (profile.stars || 0) + starsToAdd }).eq('id', user.id)
                }
            }
        }

        // Refresh Profile to get new stars
        await refreshProfile()

        toast.dismiss()
        toast.success('Pedido pagado correctamente, en breve estaras disfrutando de tu burga! 🍔')

        clearCart()
        navigate('/')

    } catch (error) {
        console.error('Error simulando:', error)
        toast.dismiss()
        toast.error('Error al simular: ' + error.message)
    }
}

const handleCheckout = async () => {
    if (!orderType) {
        toast.warning('Por favor selecciona: DELIVERY o RETIRO EN LOCAL')
        return
    }

    if (orderType === 'delivery' && !address.trim()) {
        toast.error('Por favor confirma tu ubicación en el mapa')
        return
    }

    if (orderType === 'delivery' && shippingCost === 0 && distanceKm === 0) {
        toast.error('Calculando costo de envío, por favor espera...')
        return
    }

    if (!selectedSlot) {
        toast.error('Por favor selecciona un HORARIO de entrega/retiro')
        return
    }

    // Check if Cash Register is OPEN (Blocker)
    // User Request: "No se pueden recibir pedidos sin haber abierto la caja"
    // We use an RPC call to bypass RLS, ensuring guests can check this too.
    const { data: isOpen, error: rpcError } = await supabase.rpc('is_register_open')

    if (rpcError) {
        console.error('Error referencing register status:', rpcError)
        // If RPC fails (e.g. not created yet), we might fall back or allow. 
        // But for safety, let's log and assume closed if strict, OR allow if lenient.
        // Given the request, we block.
    }

    if (!isOpen) {
        toast.error('Lo sentimos, el local no ha abierto caja aún. Intenta nuevamente en unos minutos.', {
            duration: 5000,
        })
        return
    }

    // Custom Toast Confirmation - REPLACED BY MODAL
    setShowConfirmModal(true)
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
    <div className="min-h-screen bg-[var(--color-background)] pb-64">
        <header className="p-4 flex items-center sticky top-0 bg-[var(--color-background)]/90 backdrop-blur-md z-40 border-b border-white/5">
            <Link to="/menu" className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="ml-2 font-bold text-lg">Tu Pedido</h1>
        </header>

        <main className="p-4 max-w-lg mx-auto space-y-6">

            {/* Delivery Toggle (Moved to Main) */}
            <div className="bg-[var(--color-surface)] p-1 rounded-xl flex border border-white/5">
                <button
                    onClick={() => { setOrderType('takeaway'); setShippingCost(0); setSelectedSlot(null); }}
                    className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${orderType === 'takeaway' ? 'bg-[var(--color-secondary)] text-white shadow-lg' : 'text-[var(--color-text-muted)]'}`}
                >
                    Retiro en Local
                </button>
                <button
                    onClick={() => { setOrderType('delivery'); setSelectedSlot(null); }}
                    className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${orderType === 'delivery' ? 'bg-[var(--color-secondary)] text-white shadow-lg' : 'text-[var(--color-text-muted)]'}`}
                >
                    Delivery
                </button>
            </div>

            {/* SLOT SELECTOR */}
            <div className="animated-slide-up">
                <p className="text-sm text-[var(--color-text-muted)] mb-2 font-medium">Selecciona Horario:</p>
                <DeliverySlotSelector
                    orderType={orderType}
                    selectedSlot={selectedSlot}
                    onSlotSelect={setSelectedSlot}
                />
            </div>

            {/* Map Integration (Moved to Main) */}
            {orderType === 'delivery' && (
                <div className="animated-slide-up space-y-2">
                    <div className="bg-orange-500/10 text-orange-400 p-3 rounded-lg text-sm mb-2 border border-orange-500/20">
                        📍 Selecciona tu ubicación exacta en el mapa
                    </div>
                    <DeliveryMap
                        storeLocation={{
                            lat: deliverySettings.store_lat,
                            lng: deliverySettings.store_lng
                        }}
                        onDistanceCalculated={handleDistanceCalculated}
                        onAddressSelected={handleAddressSelected}
                    />
                    {distanceKm > 0 && (
                        <div className="flex justify-between items-center text-sm px-2 bg-[var(--color-surface)] p-3 rounded-xl border border-white/5">
                            <span className="text-[var(--color-text-muted)] flex items-center gap-1">
                                <MapPin className="w-4 h-4" /> {distanceKm.toFixed(1)} km
                            </span>
                            <span className="text-[var(--color-secondary)] font-bold flex items-center gap-1">
                                <Car className="w-4 h-4" /> Envío: ${shippingCost}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* List Items */}
            <div className="space-y-4">
                {cart.map((item, index) => (
                    <div key={item.id} className="bg-[var(--color-surface)] rounded-2xl p-4 border border-white/5 animated-slide-up" style={{ animationDelay: `${index * 100} ms` }}>
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
            </div>

            <button
                onClick={() => setShowAddOrderModal(true)}
                className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center gap-2 text-[var(--color-text-muted)] hover:border-[var(--color-secondary)] hover:text-[var(--color-secondary)] transition-all font-bold"
            >
                <Plus className="w-5 h-5" />
                Agregar otro pedido
            </button>
        </main>

        {/* Delivery Footer - Only Coupon, Total & Pay */}
        <div className="fixed bottom-0 w-full bg-[var(--color-surface)]/95 backdrop-blur-xl border-t border-white/5 p-6 z-50 rounded-t-3xl shadow-2xl">
            <div className="max-w-lg mx-auto space-y-4">

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

                {/* Payment Method Selector */}
                <div className="bg-[var(--color-background)] p-1 rounded-xl flex border border-white/10 mb-2">
                    <button
                        onClick={() => setPaymentMethod('mercadopago')}
                        className={`flex-1 py-3 rounded-lg font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 ${paymentMethod === 'mercadopago' ? 'bg-[#009ee3] text-white shadow-lg' : 'text-[var(--color-text-muted)]'}`}
                    >
                        <span>💳 Mercado Pago</span>
                    </button>
                    <button
                        onClick={() => setPaymentMethod('transfer')}
                        className={`flex-1 py-3 rounded-lg font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 ${paymentMethod === 'transfer' ? 'bg-purple-600 text-white shadow-lg' : 'text-[var(--color-text-muted)]'}`}
                    >
                        <span>🏦 Transferencia</span>
                    </button>
                    <button
                        onClick={() => setPaymentMethod('cash')}
                        className={`flex-1 py-3 rounded-lg font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 ${paymentMethod === 'cash' ? 'bg-green-600 text-white shadow-lg' : 'text-[var(--color-text-muted)]'}`}
                    >
                        <span>💵 Efectivo</span>
                    </button>
                </div>

                <button onClick={handleCheckout} className={`w-full text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all
                        ${!orderType ? 'bg-gray-600 cursor-not-allowed opacity-50' :
                        paymentMethod === 'mercadopago' ? 'bg-[#009ee3] hover:bg-[#009ee3]/90 shadow-blue-900/20' :
                            paymentMethod === 'transfer' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20' :
                                'bg-green-600 hover:bg-green-500 shadow-green-900/20'}`}>
                    {orderType === 'delivery' ?
                        (paymentMethod === 'mercadopago' ? 'Pagar con Mercado Pago' : paymentMethod === 'transfer' ? 'Confirmar (Transferencia)' : 'Confirmar (Efectivo)') :
                        (paymentMethod === 'mercadopago' ? 'Pagar Retiro con MP' : paymentMethod === 'transfer' ? 'Confirmar (Transferencia)' : 'Confirmar (Efectivo)')
                    }
                </button>
            </div>
        </div>

        {/* Modals */}
        <OrderConfirmationModal
            isOpen={showConfirmModal}
            orderData={{
                total: finalTotal, // Use finalTotal here
                type: orderType,
                items: cart,
                address: address, // Pass address
                customerName: user?.user_metadata?.name || 'Cliente',
                customerPhone: user?.phone || '', // User phone if available
                paymentMethod: paymentMethod === 'mercadopago' ? 'Mercado Pago' : paymentMethod === 'transfer' ? 'Transferencia' : 'Efectivo'
            }}
            onConfirm={() => {
                setShowConfirmModal(false)
                processOrder()
            }}
            onClose={() => setShowConfirmModal(false)}
        />

        <OrderModal
            isOpen={showAddOrderModal}
            onClose={() => setShowAddOrderModal(false)}
        />

        {/* DEV TOOL: Simulation Button */}
        <div className="fixed top-20 right-4 z-50">
            <button
                onClick={simulatePayment}
                className="bg-purple-600 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-lg opacity-50 hover:opacity-100 transition-opacity flex items-center gap-1"
            >
                🛠 Simular Pago
            </button>
        </div>

    </div >
)
}

export default CheckoutPage
