import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Loader2, Check, Clock, X, ChefHat, Bell, Trash2, Banknote, CreditCard, Printer, Usb, Plus, Bike } from 'lucide-react'
import { toast } from 'sonner'
import TicketTemplate from './print/TicketTemplate'
import { EscPosEncoder } from '../utils/escPosEncoder'
import { usbPrinter } from '../services/UsbPrinterService'
import { format } from 'date-fns'

import POSModal from './POSModal'
import AssignDriverModal from './AssignDriverModal'

const OrdersManager = () => {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [usbConnected, setUsbConnected] = useState(false)
    const [printingOrder, setPrintingOrder] = useState(null)
    const [isPOSOpen, setIsPOSOpen] = useState(false)

    // Assign Driver Modal
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
    const [selectedOrderForAssignment, setSelectedOrderForAssignment] = useState(null)

    // Filter States
    const [filters, setFilters] = useState({
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        paymentMethod: 'TODAS',
        status: 'TODOS',
        driver: 'TODOS',
        deliveryType: 'TODOS',
        zone: '',
        delay: 'TODOS'
    })

    useEffect(() => {
        fetchOrders()

        // 1. Try Auto-Connect USB Printer
        usbPrinter.tryAutoConnect().then(connected => {
            if (connected) {
                setUsbConnected(true)
                toast.success('Impresora reconectada automáticamente 🔌')
            }
        })

        // Subscription for real-time updates (Silent refresh)
        const channel = supabase
            .channel('orders_visual_refresh')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders'
            }, () => {
                // Just refresh data, global alert handles the sound/toast
                fetchOrders()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [filters.startDate, filters.endDate]) // Refetch when dates change

    const fetchOrders = async () => {
        setLoading(true)

        // Base query with date range
        let query = supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    products (name) 
                ),
                drivers!fk_orders_drivers (
                    name
                ),
                profiles (*)
            `)
            .gte('created_at', `${filters.startDate}T00:00:00`)
            .lte('created_at', `${filters.endDate}T23:59:59`)
            .order('created_at', { ascending: false })

        const { data: ordersData, error } = await query

        if (error) {
            console.error('Error fetching orders:', error)
            toast.error(`Error: ${error.message || 'Error al cargar pedidos'}`)
        }

        if (ordersData) setOrders(ordersData)
        setLoading(false)
    }

    // Client-side filtering
    const filteredOrders = orders.filter(order => {
        // Payment Method
        if (filters.paymentMethod !== 'TODAS') {
            if (filters.paymentMethod === 'Efectivo' && order.payment_method !== 'cash') return false
            if (filters.paymentMethod === 'Mercado Pago' && order.payment_method !== 'mercadopago') return false
            if (filters.paymentMethod === 'Transferencia' && order.payment_method !== 'transfer') return false
        }

        // Status
        if (filters.status !== 'TODOS' && order.status !== filters.status.toLowerCase()) {
            if (order.status !== filters.status) return false
        }

        // Delivery Type
        if (filters.deliveryType !== 'TODOS') {
            const type = filters.deliveryType === 'Delivery' ? 'delivery' : 'pickup'
            if (order.order_type !== type) return false
        }

        // Driver
        if (filters.driver !== 'TODOS') {
            const driverName = order.drivers?.name || ''
            if (!driverName.toLowerCase().includes(filters.driver.toLowerCase())) return false
        }

        // Zone (Address search)
        if (filters.zone && filters.zone.trim() !== '') {
            if (!order.delivery_address?.toLowerCase().includes(filters.zone.toLowerCase())) return false
        }

        return true
    })

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    const resetFilters = () => {
        setFilters({
            startDate: format(new Date(), 'yyyy-MM-dd'),
            endDate: format(new Date(), 'yyyy-MM-dd'),
            paymentMethod: 'TODAS',
            status: 'TODOS',
            driver: 'TODOS',
            deliveryType: 'TODOS',
            zone: '',
            delay: 'TODOS'
        })
    }

    const openAssignModal = (orderId) => {
        setSelectedOrderForAssignment(orderId)
        setIsAssignModalOpen(true)
    }

    const updateStatus = async (orderId, newStatus) => {
        const order = orders.find(o => o.id === orderId)

        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId)

        if (!error) {
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
            toast.success(`Pedido actualizado a: ${newStatus}`)

            // Log Cash Sale if Completed
            if (newStatus === 'completed' || newStatus === 'paid') {
                const { logCashSale } = await import('../utils/cashUtils')
                const result = await logCashSale(orderId, order.total, order.payment_method, supabase)
                if (result.message && newStatus === 'completed' && order.payment_method === 'cash') {
                    if (result.success) toast.success(result.message)
                    else toast.warning(result.message)
                }
            }

        } else {
            console.error('Error updating status:', error)
            toast.error('Error al actualizar estado')
        }
    }

    const deleteOrder = (orderId) => {
        toast.warning('¿Eliminar pedido permanentemente?', {
            description: 'Esta acción no se puede deshacer.',
            action: {
                label: 'Eliminar',
                onClick: async () => {
                    const { error } = await supabase
                        .from('orders')
                        .delete()
                        .eq('id', orderId)

                    if (!error) {
                        setOrders(prev => prev.filter(o => o.id !== orderId))
                        toast.success('Pedido eliminado')
                    } else {
                        console.error('Error deleting order:', error)
                        toast.error('Error al eliminar pedido')
                    }
                }
            },
            cancel: {
                label: 'Cancelar'
            }
        })
    }

    const clearHistory = () => {
        toast.warning('¿Limpiar historial completo?', {
            description: 'Se borrarán todos los pedidos finalizados y cancelados.',
            action: {
                label: 'Confirmar Limpieza',
                onClick: async () => {
                    setLoading(true)
                    const { error } = await supabase
                        .from('orders')
                        .delete()
                        .in('status', ['completed', 'cancelled', 'rejected'])

                    if (!error) {
                        await fetchOrders()
                        toast.success('Historial limpio')
                    } else {
                        console.error('Error clearing history:', error)
                        toast.error('Error al limpiar historial')
                    }
                    setLoading(false)
                }
            },
            cancel: {
                label: 'Cancelar'
            }
        })
    }

    const clearAllOrders = () => {
        toast.error('¿BORRAR ABSOLUTAMENTE TODO?', {
            description: '¡Cuidado! Esto eliminará TODOS los pedidos, incluidos los que están EN CURSO (Pendientes, Cocinando...).',
            action: {
                label: 'SÍ, BORRAR TODO',
                onClick: async () => {
                    setLoading(true)

                    // Delete orders (Cascade will handle order_items - Ensure SQL_FIX_ORDER_ITEMS_CASCADE.sql is run)
                    const { error } = await supabase
                        .from('orders')
                        .delete()
                        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all valid UUIDs
                    // Alternative: .gt('total', -1) work if total is numeric, but ID check is cleaner for "ALL"

                    if (!error) {
                        await fetchOrders()
                        toast.success('Se eliminaron TODOS los pedidos')
                    } else {
                        console.error('Error deleting all:', error)
                        toast.error('Error al vaciar la base de datos')
                    }
                    setLoading(false)
                }
            },
            cancel: {
                label: 'Cancelar'
            }
        })
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500/20 text-yellow-500'
            case 'pending_approval': return 'bg-blue-500/20 text-blue-400 animate-pulse'
            case 'cooking': return 'bg-orange-500/20 text-orange-500'
            case 'packaging': return 'bg-red-500/20 text-red-500 font-black animate-bounce'
            case 'sent': return 'bg-purple-500/20 text-purple-500'
            case 'completed': return 'bg-gray-500/20 text-gray-400'
            case 'cancelled':
            case 'rejected': return 'bg-red-500/20 text-red-500'
            default: return 'bg-gray-500/20 text-gray-400'
        }
    }

    const connectPrinter = async () => {
        try {
            await usbPrinter.connect()
            setUsbConnected(true)
            toast.success('Impresora USB Conectada 🔌')
        } catch (err) {
            console.error(err)
            toast.error('No se pudo conectar impresora USB')
        }
    }

    const printViaUsb = async (order) => {
        try {
            const encoder = new EscPosEncoder()
                .initialize()

                // 1. Tiny Timestamp Top-Left (Matches TicketTemplate)
                .align('left')
                .size(0, 0)
                .text(format(new Date(), 'yy/M/d, H:mm'))
                .newline(2)

                // 2. Huge ORDEN Header
                .align('center')
                .bold(true)
                .size(1, 1).text('ORDEN')
                .newline()
                .size(2, 2).text(`#${order.id.slice(0, 8)}`)
                .newline(2)

                // 3. Date/Time Rows
                .align('left')
                .size(0, 0).bold(true)
                .text('Fecha: ').bold(false).text(format(new Date(order.created_at), 'yyyy-MM-dd')).newline()
                .bold(true).text('Hora:  ').bold(false).text(format(new Date(order.created_at), 'HH:mm')).newline()
                .newline()

                .line() // Separator ----------------
                .newline()

                // 4. Customer Info
                .bold(false).text('Cliente: ')
                .bold(true).size(1, 1).text(`${order.profiles?.full_name || 'Invitado'}`) // Big Name
                .size(0, 0).bold(false) // Reset
                .newline(2)

                // --- HUGE DELIVERY / RETIRO BLOCK ---
                .align('center')
                .invert(true) // Black background
                .bold(true)
                .size(3, 3) // SUPER SIZE
                .text(order.order_type === 'delivery' ? ' DELIVERY ' : ' RETIRO ')
                .size(0, 0)
                .bold(false)
                .invert(false) // Reset
                .align('left')
                // ------------------------------------

                .newline(2)

            if (order.delivery_address) {
                encoder.text(order.delivery_address).newline()
            }
            if (order.profiles?.phone) {
                encoder.text(`Tel: ${order.profiles.phone}`).newline()
            }

            encoder.newline()
                .line() // Separator ----------------
                .newline()

            // 5. Items
            order.order_items?.forEach(item => {
                // "1 x Product Name" (Bold, Medium-Large)
                encoder.bold(true).size(2, 2) // <-- INCREASED THIS TO 2, 2 (3X SIZE)
                    .text(`${item.quantity} x ${item.products?.name}`)
                    .newline()
                    .size(0, 0).bold(false) // Reset

                // Modifiers
                if (item.modifiers?.length > 0) {
                    item.modifiers.forEach(m => {
                        encoder.text(`   ${m.name}`).newline()
                    })
                }
                if (item.side_info) encoder.text(`   + ${item.side_info.name}`).newline()
                if (item.drink_info) encoder.text(`   + ${item.drink_info.name}`).newline()

                encoder.newline()
            })

            encoder.line() // Separator ----------------
                .newline()

                // 6. Payment Info
                .bold(true).text('Forma pago: ').bold(false).text(order.payment_method === 'mercadopago' ? 'Mercado Pago' : order.payment_method).newline()
                .bold(true).text('Forma entrega: ').bold(false).text(order.order_type).newline()
                .newline(2)

                // 7. TOTAL (Massive)
                .bold(true)
                .size(1, 1).text('TOTAL').newline()
                .size(3, 3).text(`$${order.total}`) // Largest size
                .newline(4)
                .cut()

            await usbPrinter.print(encoder.encode())
            toast.success('Impreso via USB 🖨️')
        } catch (err) {
            console.error('USB Print failed', err)
            toast.error('Error USB. Intentando modo clásico...')
            // Fallback
            handleWindowPrint(order)
        }
    }

    const handleWindowPrint = (order) => {
        setPrintingOrder(order)
        setTimeout(() => {
            window.print()
        }, 100)
    }

    const handlePrint = (order) => {
        // 1. Android Native Print (Priority)
        if (window.AndroidPrint) {
            const printPayload = {
                id: order.id,
                created_at: order.created_at,
                total: order.total,
                // Customer Details
                client_name: order.profiles?.full_name || 'Invitado',
                client_address: order.profiles?.address || order.delivery_address || '',
                client_phone: order.profiles?.phone || '',
                client_shift: order.scheduled_time || '', // Ensure this column is selected in fetchOrders

                order_type: order.order_type,
                payment_method: order.payment_method,
                // Items mapping
                cart_items: order.order_items.map(item => ({
                    name: item.products?.name || 'Producto',
                    quantity: item.quantity,
                    notes: item.notes,
                    modifiers: item.modifiers || []
                }))
            }
            try {
                window.AndroidPrint.printTicket(JSON.stringify(printPayload))
                toast.success('Imprimiendo ticket... 🖨️')
            } catch (e) {
                console.error('Android Print Error:', e)
                toast.error('Error al imprimir en Android')
            }
            return
        }

        // 2. WebUSB Print
        if (usbConnected) {
            printViaUsb(order)
        } else {
            // 3. Browser Print Fallback
            handleWindowPrint(order)
        }
    }

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[var(--color-secondary)]" /></div>

    return (
        <div className="space-y-6">
            {/* Hidden Ticket Template for Printing */}
            <div className="hidden">
                <TicketTemplate order={printingOrder} />
            </div>

            <AssignDriverModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                orderId={selectedOrderForAssignment}
                onAssignSuccess={fetchOrders}
            />

            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <ChefHat className="text-[var(--color-secondary)]" />
                    Gestión de Pedidos
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsPOSOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-bold hover:brightness-110 transition-colors shadow-lg shadow-purple-900/20"
                    >
                        <Plus className="w-4 h-4" />
                        Tomar Pedido
                    </button>
                    <button
                        onClick={connectPrinter}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-lg ${usbConnected ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-500'}`}
                    >
                        <Usb className="w-4 h-4" />
                        {usbConnected ? 'Impresora Conectada' : 'Conectar Impresora'}
                    </button>
                    <button
                        onClick={clearAllOrders}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                    >
                        <Trash2 className="w-4 h-4" />
                        Borrar TODO
                    </button>
                    <button
                        onClick={clearHistory}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Limpiar Completados
                    </button>
                </div>
            </div>

            <POSModal
                isOpen={isPOSOpen}
                onClose={() => setIsPOSOpen(false)}
                onSuccess={() => {
                    fetchOrders()
                }}
            />

            {/* Filters Section */}
            <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-white/5 space-y-4 shadow-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {/* Date Range */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Desde Fecha</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors text-white"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Hasta Fecha</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors text-white"
                        />
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Forma de pago</label>
                        <select
                            value={filters.paymentMethod}
                            onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                            className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors text-white"
                        >
                            <option value="TODAS">TODAS</option>
                            <option value="Efectivo">Efectivo</option>
                            <option value="Mercado Pago">Mercado Pago</option>
                            <option value="Transferencia">Transferencia</option>
                        </select>
                    </div>

                    {/* Status */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Estado</label>
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors text-white"
                        >
                            <option value="TODOS">TODOS</option>
                            <option value="pending">Pendiente</option>
                            <option value="cooking">Cocinando</option>
                            <option value="packaging">Empaquetando</option>
                            <option value="sent">Enviado</option>
                            <option value="completed">Completado</option>
                            <option value="cancelled">Cancelado</option>
                            <option value="rejected">Rechazado</option>
                        </select>
                    </div>

                    {/* Delivery Type */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Tipo entrega</label>
                        <select
                            value={filters.deliveryType}
                            onChange={(e) => handleFilterChange('deliveryType', e.target.value)}
                            className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors text-white"
                        >
                            <option value="TODOS">TODOS</option>
                            <option value="Delivery">Delivery</option>
                            <option value="Retiro">Retiro</option>
                        </select>
                    </div>

                    {/* Actions */}
                    <div className="flex items-end gap-2">
                        <button
                            onClick={fetchOrders}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-bold text-sm transition-colors shadow-lg shadow-red-900/20"
                        >
                            FILTRAR
                        </button>
                        <button
                            onClick={resetFilters}
                            className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-lg font-bold text-sm transition-colors"
                        >
                            LIMPIAR
                        </button>
                    </div>
                </div>

                {/* Second Row of Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 border-t border-white/5 pt-4">
                    {/* Driver */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Repartidor (Nombre)</label>
                        <input
                            type="text"
                            placeholder="Nombre exacto..."
                            value={filters.driver === 'TODOS' ? '' : filters.driver}
                            onChange={(e) => handleFilterChange('driver', e.target.value || 'TODOS')}
                            className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors text-white"
                        />
                    </div>

                    {/* Zone (Address) */}
                    <div className="space-y-1 col-span-2">
                        <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Zonas (Buscar en Dirección)</label>
                        <input
                            type="text"
                            placeholder="Ej: Av. Principal, Centro..."
                            value={filters.zone}
                            onChange={(e) => handleFilterChange('zone', e.target.value)}
                            className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors text-white"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredOrders.map(order => (
                    <div key={order.id} className={`bg-[var(--color-surface)] rounded-2xl border overflow-hidden flex flex-col transition-all duration-300 ${order.status === 'packaging'
                        ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse'
                        : 'border-white/5'
                        }`}>
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 bg-[var(--color-background)]/50 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold">#{order.id.slice(0, 8)}</span>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${getStatusColor(order.status)}`}>
                                        {order.status}
                                    </span>
                                </div>
                                <span className="text-xs text-[var(--color-text-muted)]">
                                    {new Date(order.created_at).toLocaleString()}
                                </span>
                                {order.order_type === 'delivery' ? (
                                    <div className="flex items-center gap-1 mt-1 text-xs text-blue-400 font-medium">
                                        <Bell className="w-3 h-3" /> Delivery
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 mt-1 text-xs text-green-400 font-medium">
                                        <ChefHat className="w-3 h-3" /> Take Away
                                    </div>
                                )}
                                {order.delivery_address && (
                                    <div className="text-xs text-white/70 italic mt-0.5 max-w-[150px] truncate">
                                        📍 {order.delivery_address}
                                    </div>
                                )}

                                {/* Driver Badge */}
                                {order.drivers?.name ? (
                                    <div className="flex items-center gap-1 mt-2 text-xs text-orange-400 font-bold bg-orange-500/10 px-2 py-1 rounded-lg border border-orange-500/20 w-fit">
                                        <Bike className="w-3 h-3" /> {order.drivers.name}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 mt-2 text-xs text-white/30 font-bold bg-white/5 px-2 py-1 rounded-lg border border-white/5 w-fit">
                                        <Bike className="w-3 h-3" /> (Sin repartidor)
                                    </div>
                                )}

                            </div>
                            <div>
                                <div className="mt-1">
                                    {order.payment_method === 'cash' && (
                                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/20 text-green-300 text-xs font-bold border border-green-500/30 w-fit">
                                            <Banknote className="w-3.5 h-3.5" /> Efectivo
                                        </span>
                                    )}
                                    {order.payment_method === 'transfer' && (
                                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30 w-fit">
                                            <Banknote className="w-3.5 h-3.5" /> Transferencia
                                        </span>
                                    )}
                                    {order.payment_method === 'mercadopago' && (
                                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30 w-fit">
                                            <CreditCard className="w-3.5 h-3.5" /> Mercado Pago
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                <span className="font-bold text-lg block">${order.total}</span>
                                <div className="flex gap-1">
                                    {/* Assign Driver Button */}
                                    <button
                                        onClick={() => openAssignModal(order.id)}
                                        className="text-orange-400 hover:text-white p-1 rounded hover:bg-orange-500/20 transition-colors"
                                        title="Asignar Repartidor"
                                    >
                                        <Bike className="w-4 h-4" />
                                    </button>

                                    <button
                                        onClick={() => handlePrint(order)}
                                        className="text-[var(--color-text-muted)] hover:text-white p-1 rounded hover:bg-white/10"
                                        title="Imprimir Ticket"
                                    >
                                        <Printer className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => deleteOrder(order.id)}
                                        className="text-[var(--color-text-muted)] hover:text-red-400 p-1 rounded hover:bg-white/10"
                                        title="Eliminar pedido"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="p-4 flex-1 space-y-3">
                            {order.order_items?.map(item => (
                                <div key={item.id} className="text-sm">
                                    <div className="flex justify-between font-medium">
                                        <span>1x {item.products?.name}</span>
                                        <span className="text-[var(--color-text-muted)]">${item.price_at_time}</span>
                                    </div>

                                    {/* Sub-items details */}
                                    <div className="pl-4 border-l border-white/10 mt-1 text-xs text-[var(--color-text-muted)] space-y-0.5">
                                        {item.modifiers?.map((m, i) => (
                                            <div key={i}>+ {m.name} {m.quantity > 1 ? <span className="text-white font-bold">x{m.quantity}</span> : ''}</div>
                                        ))}
                                        {item.side_info && <div>+ {item.side_info.name}</div>}
                                        {item.drink_info && <div>+ {item.drink_info.name}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="p-3 bg-[var(--color-background)]/30 grid grid-cols-3 gap-2">
                            {(order.status === 'pending' || order.status === 'pending_approval') && (
                                <div className="col-span-3 space-y-2">
                                    {/* Primary Actions: Accept / Reject */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => {
                                                // If MP, standard 'Accept' moves to 'pending_payment' to trigger user payment flow
                                                if (order.status === 'pending_approval') {
                                                    updateStatus(order.id, 'pending_payment')
                                                } else {
                                                    // Standard Cash/Transfer -> Cooking
                                                    handlePrint(order)
                                                    updateStatus(order.id, 'cooking')
                                                }
                                            }}
                                            className="bg-green-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-green-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
                                        >
                                            <Check className="w-4 h-4" /> Aceptar
                                        </button>

                                        <button
                                            onClick={() => {
                                                toast('¿Rechazar pedido?', {
                                                    action: {
                                                        label: 'Sí, Rechazar',
                                                        onClick: () => updateStatus(order.id, 'rejected')
                                                    },
                                                })
                                            }}
                                            className="bg-red-500/10 text-red-500 py-2 rounded-lg font-bold text-sm hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <X className="w-4 h-4" /> Rechazar
                                        </button>
                                    </div>

                                    {/* Secondary Action: Confirm Payment (if needed) */}
                                    {!order.is_paid && order.payment_method !== 'cash' && order.status !== 'pending_approval' && (
                                        <button
                                            onClick={async () => {
                                                const { error } = await supabase.from('orders').update({ is_paid: true }).eq('id', order.id)
                                                if (!error) {
                                                    setOrders(orders.map(o => o.id === order.id ? { ...o, is_paid: true } : o))
                                                    toast.success('Pago confirmado')
                                                } else {
                                                    toast.error('Error al confirmar pago')
                                                }
                                            }}
                                            className="w-full bg-blue-500/10 text-blue-400 py-1.5 rounded-lg font-medium text-xs hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Banknote className="w-3 h-3" /> Confirmar recepción del pago
                                        </button>
                                    )}
                                </div>
                            )}
                            {order.status === 'cooking' && (
                                <div className="col-span-3 space-y-2">
                                    <button onClick={() => updateStatus(order.id, 'packaging')} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-blue-500 transition-colors flex items-center justify-center gap-2">
                                        <Check className="w-4 h-4" /> Preparar Envío
                                    </button>

                                    {/* Still show Confirm Payment if enabled and not paid */}
                                    {!order.is_paid && order.payment_method !== 'cash' && (
                                        <button
                                            onClick={async () => {
                                                const { error } = await supabase.from('orders').update({ is_paid: true }).eq('id', order.id)
                                                if (!error) {
                                                    setOrders(orders.map(o => o.id === order.id ? { ...o, is_paid: true } : o))
                                                    toast.success('Pago confirmado')
                                                } else {
                                                    toast.error('Error al confirmar pago')
                                                }
                                            }}
                                            className="w-full bg-blue-500/10 text-blue-400 py-1.5 rounded-lg font-medium text-xs hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Banknote className="w-3 h-3" /> Confirmar recepción del pago
                                        </button>
                                    )}
                                </div>
                            )}
                            {order.status === 'packaging' && (
                                <button onClick={() => updateStatus(order.id, 'sent')} className="col-span-3 bg-purple-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-purple-500 transition-colors flex items-center justify-center gap-2">
                                    <Bell className="w-4 h-4" /> Enviar Pedido
                                </button>
                            )}
                            {order.status === 'sent' && (
                                <button onClick={() => updateStatus(order.id, 'completed')} className="col-span-3 bg-gray-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-gray-500 transition-colors flex items-center justify-center gap-2">
                                    <Check className="w-4 h-4" /> Finalizar / Entregado
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {filteredOrders.length === 0 && (
                    <div className="col-span-full py-20 text-center text-[var(--color-text-muted)]">
                        No hay pedidos recientes.
                    </div>
                )}
            </div>
        </div >
    )
}

export default OrdersManager
