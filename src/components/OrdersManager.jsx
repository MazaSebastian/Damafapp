import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Search, Filter, RefreshCw, X, Check, Clock, Truck, FileText, ChevronDown, ChevronUp, Printer, Trash2, Bike, Banknote, CreditCard, Pencil, Loader2, ChefHat, Bell, Usb, Plus, StickyNote } from 'lucide-react'
import { toast } from 'sonner'
import TicketTemplate from './print/TicketTemplate'
import { EscPosEncoder } from '../utils/escPosEncoder'
import { usbPrinter } from '../services/UsbPrinterService'
import { format } from 'date-fns'

import POSModal from './POSModal'
import AssignDriverModal from './AssignDriverModal'
import EditOrderModal from './EditOrderModal'
import ConfirmModal from './ConfirmModal'
import { useRealtimeConnection } from '../hooks/useRealtimeConnection'

const OrdersManager = () => {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [usbConnected, setUsbConnected] = useState(false)
    const [printingOrder, setPrintingOrder] = useState(null)
    const [isPOSOpen, setIsPOSOpen] = useState(false)

    // Assign Driver Modal
    // Assign Driver Modal
    const [selectedOrderForDriver, setSelectedOrderForDriver] = useState(null)
    const [editingOrder, setEditingOrder] = useState(null) // State for edit modal
    const [orderToDelete, setOrderToDelete] = useState(null)
    const [isClearHistoryModalOpen, setIsClearHistoryModalOpen] = useState(false) // State for delete modal

    // Filter States
    const [filters, setFilters] = useState({
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        paymentMethod: 'TODAS',
        status: 'TODOS',
        driver: 'TODOS',
        deliveryType: 'TODOS',
        zone: '',
        delay: 'TODOS',
        clientName: '',
        orderId: ''
    })

    // ...

    useEffect(() => {
        fetchOrders()

        // 1. Try Auto-Connect USB Printer
        usbPrinter.tryAutoConnect().then(connected => {
            if (connected) {
                setUsbConnected(true)
                toast.success('Impresora reconectada automáticamente 🔌')
            }
        })
    }, [filters.startDate, filters.endDate])

    // Auto-Refresh Logic (Mobile/Tab Focus + 30s Polling)
    useRealtimeConnection(() => fetchOrders(false), [filters], 'OrdersManager', 30000)

    const fetchOrders = async (showLoading = true) => {
        if (showLoading) setLoading(true)

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
        profiles (*),
        invoices (
            id,
            cae,
            cbte_nro,
            cbte_tipo,
            pt_vta,
            created_at,
            total_amount
        ),

        `)
            .gte('created_at', new Date(`${filters.startDate}T00:00:00`).toISOString())
            .lte('created_at', new Date(`${filters.endDate}T23:59:59.999`).toISOString())
            .order('created_at', { ascending: false })


        const { data: ordersData, error } = await query

        if (error) {
            console.error('Error fetching orders:', error)
            toast.error(`Error: ${error.message || 'Error al cargar pedidos'}`)
        }

        if (ordersData) {
            setOrders(ordersData)
            // We do NOT update editingOrder here anymore to prevent modal re-renders/blinking.
            // The modal handles its own optimistic state.
        }
        if (showLoading) setLoading(false)
    }

    // ... (rest of code) ...

    
<EditOrderModal
        isOpen={!!editingOrder}
        onClose={() => setEditingOrder(null)}
        order={editingOrder}
        onUpdate={() => {
            fetchOrders(false) // Silent update
        }}
    />

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

        // Client Name
        if (filters.clientName && filters.clientName.trim() !== '') {
            const name = order.profiles?.full_name || order.customer_name || 'Invitado'
            if (!name.toLowerCase().includes(filters.clientName.toLowerCase())) return false
        }

        // Order ID
        if (filters.orderId && filters.orderId.trim() !== '') {
            const searchId = filters.orderId.toLowerCase()
            // Check UUID or friendly ID if implemented, for now UUID slice
            if (!order.id.toLowerCase().includes(searchId)) return false
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
            delay: 'TODOS',
            clientName: '',
            orderId: ''
        })
    }

    const openAssignModal = (orderId) => {
        setSelectedOrderForDriver(orderId)
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

            // Auto-Print on Acceptance (Cooking)
            if (newStatus === 'cooking') {
                toast.info('Autoprint cooking...')
                // Wait briefly for state or simply trigger
                setTimeout(() => {
                    handlePrint({ ...order, status: newStatus })
                }, 500)
            }

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
        setOrderToDelete(orderId)
    }

    const confirmDeleteOrder = async () => {
        if (!orderToDelete) return

        const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', orderToDelete)

        if (!error) {
            setOrders(prev => prev.filter(o => o.id !== orderToDelete))
            toast.success('Pedido eliminado correctamente')
        } else {
            console.error('Error deleting order:', error)
            toast.error('Error al eliminar pedido')
        }
        setOrderToDelete(null)
    }

    const clearHistory = () => {
        setIsClearHistoryModalOpen(true)
    }

    const confirmClearHistory = async () => {
        setLoading(true)
        const { error } = await supabase
            .from('orders')
            .delete()
            .in('status', ['completed', 'cancelled', 'rejected'])

        if (!error) {
            setOrders(prev => prev.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status)))
            toast.success('Historial limpiado')
        } else {
            console.error('Error clearing history:', error)
            toast.error('Error al limpiar historial')
        }
        setLoading(false)
        setIsClearHistoryModalOpen(false) // Close modal after action
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



    const handleBilling = async (order) => {
        if (!order) return

        const toastId = toast.loading('Generando factura electrónica...')

        try {
            // 1. Call Edge Function
            const { data, error } = await supabase.functions.invoke('afip-invoice', {
                body: {
                    action: 'generate',
                    orderId: order.id,
                    environment: 'production' // TODO: Make configurable?
                }
            })

            if (error) throw error
            if (!data.success) throw new Error(data.error || 'Error desconocido al facturar')

            // 2. Success
            toast.dismiss(toastId)
            toast.success(`Factura Generada: ${data.cae}`, {
                description: `Comprobante N° ${data.number}`
            })

            // 3. Refresh Order to get invoice data
            await fetchOrders(false)

            // 4. Auto-Print with Invoice Data (Need to fetch renewed order first? Yes, typically)
            // But state update acts async. Let's try to pass enriched order manually for speed
            const enrichedOrder = {
                ...order,
                invoices: [{
                    cae: data.cae,
                    cbte_nro: data.number,
                    pt_vta: 3, // Hardcoded or returned? Function returns it usually.
                    cbte_tipo: 11 // Assuming C based on function default if monotributo
                    // Ideally we should wait for fetchOrders to update state, but let's see.
                }]
            }

            // Small delay to ensure DB propagation if we rely on fetch, but here we try optimistic print
            // actually, better to just wait a sec and fetch, or print what we have along with "Fiscal data pending"? No.
            // Let's rely on fetchOrders completing.
            // Better yet, just trigger print logic which reads from updated order state?
            // "fetchOrders" updates "orders" state.

            // Let's modify handlePrint to accept an override invoice object if needed, or just wait.
            // For now, let's just toast "Imprimiendo..."
            // And trigger print
            // We need the data from DB to be 100% sure of format.
            // Let's assume fetchOrders is fast enough or returns updated data.
            // Actually fetchOrders is async.
        } catch (err) {
            console.error('Billing Error:', err)
            toast.dismiss(toastId)
            toast.error('Error al facturar: ' + (err.message || 'Desconocido'))
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

            if (order.invoices && order.invoices.length > 0) {
                const inv = order.invoices[0]
                const tipo = inv.cbte_tipo === 11 ? 'C' : (inv.cbte_tipo === 6 ? 'B' : 'A')
                const pto = inv.pt_vta?.toString().padStart(4, '0') || '0000'
                const nro = inv.cbte_nro?.toString().padStart(8, '0') || '00000000'

                encoder
                    .size(1, 1).text(`FACTURA ${tipo}`)
                    .newline()
                    .size(0, 0).text(`N° ${pto}-${nro}`)
                    .newline(2)
            } else {
                encoder
                    .size(1, 1).text('ORDEN')
                    .newline()
                    .size(2, 2).text(`#${order.order_number ? order.order_number.toString().padStart(4, '0') : order.id.slice(0, 4)}`)
                    .newline(2)
            }

            encoder
                // 3. Date/Time Rows
                .align('left')
                .size(0, 0).bold(true)
                .text('Fecha: ').bold(false).text(format(new Date(order.created_at), 'yyyy-MM-dd')).newline()
                .bold(true).text('Hora:  ').bold(false).text(format(new Date(order.created_at), 'HH:mm')).newline()
                .newline()

            // Shift Row if exists
            if (order.scheduled_time) {
                let displayTime = order.scheduled_time
                try {
                    if (displayTime.startsWith('{')) {
                        displayTime = JSON.parse(displayTime).start_time.slice(0, 5)
                    } else {
                        displayTime = displayTime.slice(0, 5)
                    }
                } catch (e) { }

                encoder
                    .newline()
                    .align('center')
                    .invert(true)
                    .bold(true)
                    .size(2, 2) // Large Text
                    .text(` HORARIO DE ENTREGA: ${displayTime} `)
                    .size(0, 0)
                    .bold(false)
                    .invert(false)
                    .align('left')
                    .newline()
                    .newline()
            }

            encoder.line() // Separator ----------------
                .newline()

                // 4. Customer Info
                .bold(false).text('Cliente: ')
                .bold(true).size(1, 1).text(`${order.profiles?.full_name || order.client_name || 'Invitado'}`) // Big Name
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

            if (order.delivery_address || order.profiles?.address) {
                encoder.text(order.profiles?.address || order.delivery_address).newline()
            }
            if (order.profiles?.phone || order.client_phone) {
                encoder.text(`Tel: ${order.profiles?.phone || order.client_phone}`).newline()
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

            // 8. CAE FOOTER (If billed)
            if (order.invoices && order.invoices.length > 0) {
                const inv = order.invoices[0]
                encoder
                    .align('center')
                    .size(0, 0)
                    .text('--------------------------------')
                    .newline()
                    .bold(true).text(`CAE: ${inv.cae}`).newline()
                    .bold(false).text(`Vto. CAE: ${inv.cae_due_date || '-'}`).newline()
                    .newline()
            }

            encoder.cut()

            await usbPrinter.print(encoder.encode())
            toast.success('Impreso via USB 🖨️')
        } catch (err) {
            console.error('USB Print failed', err)
            toast.error('Error USB. Intentando modo clásico...')
            // Fallback
            handleWindowPrint(order)
        }
    }

    const formatScheduledTime = (order) => {
        try {
            const raw = order.scheduled_time
            if (!raw) return ''
            if (typeof raw === 'string' && !raw.includes('{') && raw.includes(':')) return raw.slice(0, 5)
            let parsed = raw
            if (typeof raw === 'string' && raw.includes('{')) {
                parsed = JSON.parse(raw)
            }
            if (parsed && parsed.start_time) return parsed.start_time.slice(0, 5)
            return typeof raw === 'string' ? raw.slice(0, 5) : '??:??'
        } catch (e) {
            return typeof order.scheduled_time === 'string' ? order.scheduled_time.slice(0, 5) : '??:??'
        }
    }
    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[var(--color-secondary)]" /></div>

    return (
        <div className="space-y-6">
            {/* Hidden Ticket Template for Printing */}
            <div className="hidden">
                <TicketTemplate order={printingOrder} />
            </div>



            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <ChefHat className="text-[var(--color-secondary)]" />
                    Gestión de Pedidos
                </h2>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsPOSOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--color-secondary)] hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-orange-900/20"
                    >
                        <Plus size={16} /> Tomar Pedido
                    </button>
                    <button
                        onClick={clearAllOrders}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-bold text-sm transition-all"
                    >
                        <Trash2 size={16} /> Borrar TODO
                    </button>
                    <button
                        onClick={clearHistory}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 rounded-xl font-bold text-sm transition-all"
                    >
                        <Trash2 size={16} /> Limpiar Completados
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
                            className="flex-1 bg-[var(--color-secondary)] hover:bg-orange-600 text-white py-2 rounded-xl font-bold text-sm transition-all shadow-lg shadow-orange-900/20 uppercase tracking-wide"
                        >
                            FILTRAR
                        </button>
                        <button
                            onClick={() => setFilters({
                                startDate: new Date().toISOString().split('T')[0],
                                endDate: new Date().toISOString().split('T')[0],
                                paymentMethod: 'TODAS',
                                status: 'TODOS',
                                deliveryType: 'TODOS'
                            })}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-sm transition-all border border-white/5 uppercase tracking-wide"
                        >
                            LIMPIAR
                        </button>
                    </div>
                </div>

                {/* Second Row of Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 border-t border-white/5 pt-4">
                    {/* Client Name */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Cliente (Nombre)</label>
                        <input
                            type="text"
                            placeholder="Nombre cliente..."
                            value={filters.clientName}
                            onChange={(e) => handleFilterChange('clientName', e.target.value)}
                            className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors text-white"
                        />
                    </div>

                    {/* Order ID */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Nº Orden</label>
                        <input
                            type="text"
                            placeholder="#ID..."
                            value={filters.orderId}
                            onChange={(e) => handleFilterChange('orderId', e.target.value)}
                            className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors text-white"
                        />
                    </div>

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
                    <div key={order.id} className={`bg-[var(--color-surface)] rounded-2xl border overflow-hidden flex flex-col transition-all duration-300 ${order.status === 'packaging' ? 'border-red-500 animate-pulse' : 'border-white/5'}`}>
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 bg-[var(--color-background)]/50 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-lg text-white">#{order.id.slice(0, 4)}</span>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${getStatusColor(order.status)}`}>{order.status}</span>
                                </div>
                                <span className="text-xs text-[var(--color-text-muted)]">{new Date(order.created_at).toLocaleString()}</span>
                                <div className="flex flex-wrap gap-2 mt-2">
                                     {order.scheduled_time && (
                                        <div className="flex items-center gap-1.5 text-xs text-white font-bold bg-orange-600 px-3 py-1.5 rounded-lg w-fit">
                                            <Clock className="w-4 h-4 text-white" />
                                            <span>{formatScheduledTime(order)}</span>
                                        </div>
                                     )}
                                     {order.order_type === 'delivery' ? (
                                        <div className="flex items-center gap-1 text-xs text-white font-bold bg-blue-600 px-3 py-1 rounded-lg w-fit"><Bell className="w-3.5 h-3.5" /> DELIVERY</div>
                                     ) : (
                                        <div className="flex items-center gap-1 text-xs text-white font-bold bg-green-600 px-3 py-1 rounded-lg w-fit"><ChefHat className="w-3.5 h-3.5" /> RETIRO</div>
                                     )}
                                </div>
                                {/* Address / Customer info placeholder simplified */}
                                <div className="mt-2 text-xs font-bold text-white">{order.client_name || 'Cliente'}</div>
                            </div>
                            <div className="text-right">
                                <span className="font-bold text-lg block">${order.total}</span>
                                <div className="flex gap-1 mt-2">
                                     <button onClick={() => updateStatus(order.id, 'cooking')} className="bg-green-600 text-white px-2 py-1 rounded text-xs">Accept</button>
                                     <button onClick={() => deleteOrder(order.id)} className="text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                        {/* Items */}
                        <div className="p-4 flex-1 space-y-3">
                             {order.order_items?.map(item => (
                                 <div key={item.id} className="text-sm flex justify-between">
                                     <span>1x {item.products?.name}</span>
                                     <span className="text-gray-400">${item.price_at_time}</span>
                                 </div>
                             ))}
                        </div>
                    </div>
                ))}

                {filteredOrders.length === 0 && (
                    <div className="col-span-full py-20 text-center text-[var(--color-text-muted)]">
                        <div className="bg-[var(--color-surface)] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 opacity-50" />
                        </div>
                        <p className="text-lg font-medium">No hay pedidos pendientes</p>
                        <p className="text-sm opacity-60">Los nuevos pedidos aparecerán aquí</p>
                    </div>
                )}
            </div>

            {/* Assign Driver Modal */}
            <AssignDriverModal
                isOpen={!!selectedOrderForDriver}
                onClose={() => setSelectedOrderForDriver(null)}
                orderId={selectedOrderForDriver}
                onAssign={() => {
                    fetchOrders()
                    setSelectedOrderForDriver(null)
                }}
            />

            {/* Edit Order Modal */}
            <EditOrderModal
                isOpen={!!editingOrder}
                onClose={() => setEditingOrder(null)}
                order={editingOrder}
                onOrderUpdated={() => {
                    fetchOrders()
                    setEditingOrder(null)
                }}
            />

        </div>
    )
}

export default OrdersManager
