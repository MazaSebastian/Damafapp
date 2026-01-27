import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createPortal } from 'react-dom'

const TicketTemplate = ({ order }) => {
    if (!order) return null
    if (typeof window === 'undefined') return null

    // Calculate delivery cost if not explicitly stored (assuming simple diff for now or 0 if pickup)
    // Ideally we should store delivery_cost in orders table. 
    // For now: if order_type is delivery, we might assume shipping is included in total so we can't easily separate without logic.
    // However, knowing the system, we added shipping cost to total.
    // Let's display the total as is.

    // Sample format uses YYYY-MM-DD
    const orderDate = new Date(order.created_at)

    return createPortal(
        <div id="ticket-print-area" className="hidden print:block bg-white text-black font-sans text-xs w-[80mm] leading-tight mx-auto">
            {/* Header timestamp - small top left in sample */}
            <div className="text-[10px] mb-2 font-mono">
                {format(orderDate, 'yy/M/d, H:mm')}
            </div>

            {/* Big Order Number */}
            <div className="text-center mb-6">
                <h1 className="text-xl font-bold uppercase">ORDEN</h1>
                <h2 className="text-4xl font-bold">#{order.id.slice(0, 8)}</h2>
            </div>

            {/* Timestamps Section */}
            <div className="mb-4 font-bold text-sm grid grid-cols-[auto_1fr] gap-x-2">
                <span>Fecha:</span>
                <span>{format(orderDate, 'yyyy-MM-dd')}</span>

                <span>Hora:</span>
                <span>{format(orderDate, 'HH:mm')}</span>

                {/* Delivery Schedule / Time */}
                {order.scheduled_time && (
                    <div className="col-span-2 mt-2 border-2 border-black p-1 text-center">
                        <div className="text-[10px] uppercase font-black">HORARIO DE ENTREGA/DELIVERY SELECCIONADO:</div>
                        <div className="text-2xl font-black">{order.scheduled_time}</div>
                    </div>
                )}
            </div>

            <hr className="border-t-2 border-black mb-4" />

            {/* Customer Info */}
            <div className="mb-6 text-sm font-bold leading-snug">
                <div className="mb-2">
                    <span className="font-normal">Cliente: </span>
                    <span className="text-lg">{order.profiles?.full_name || order.client_name || 'Invitado'}</span>
                </div>

                {order.order_type === 'delivery' ? (
                    <div className="mb-2 whitespace-pre-wrap">
                        {order.delivery_address || order.profiles?.address}
                    </div>
                ) : (
                    <div className="mb-2 italic">Retiro en Local</div>
                )}

                {(order.profiles?.phone || order.client_phone) && (
                    <div>Tel: {order.profiles?.phone || order.client_phone}</div>
                )}
            </div>

            <hr className="border-t border-black mb-4" />

            {/* Items */}
            <div className="space-y-4 mb-6">
                {order.order_items?.map((item, idx) => (
                    <div key={idx} className="flex flex-col">
                        <div className="flex font-bold text-base mb-1">
                            <span className="mr-2">{item.quantity} x</span>
                            <span>{item.products?.name}</span>
                        </div>

                        {/* Modifiers & Extras */}
                        <div className="pl-6 text-sm font-medium text-gray-800 space-y-0.5">
                            {item.modifiers?.map((m, i) => (
                                <div key={i}>{m.name}</div>
                            ))}
                            {item.side_info && <div>+ {item.side_info.name}</div>}
                            {item.drink_info && <div>+ {item.drink_info.name}</div>}
                        </div>
                    </div>
                ))}
            </div>

            <hr className="border-t border-black mb-4" />

            {/* Footer Details */}
            <div className="mb-6 font-bold text-sm space-y-1">
                <div className="flex gap-2">
                    <span>Forma pago:</span>
                    <span className="capitalize">{order.payment_method === 'mercadopago' ? 'Mercado Pago' : order.payment_method}</span>
                </div>
                <div className="flex gap-2">
                    <span>Forma entrega:</span>
                    <span className="capitalize">{order.order_type}</span>
                </div>
            </div>

            {/* Financials */}
            <div className="space-y-1 font-bold text-base mb-6">
                <div className="flex justify-between items-end mt-4">
                    <span className="uppercase text-xl tracking-widest">TOTAL</span>
                </div>
                <div className="text-4xl font-black">
                    ${order.total}
                </div>
            </div>

            {/* Cash Change info - mocked if we don't have it yet */}
            {order.payment_method === 'cash' && (
                <div className="space-y-1 font-bold text-sm mb-6">
                </div>
            )}

            <div className="text-center font-mono text-xs mt-8">
                --
            </div>
        </div>,
        document.body
    )
}

export default TicketTemplate
