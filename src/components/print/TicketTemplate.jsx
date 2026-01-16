import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const TicketTemplate = ({ order }) => {
    if (!order) return null

    // Calculate delivery cost if not explicitly stored (assuming simple diff for now or 0 if pickup)
    // Ideally we should store delivery_cost in orders table. 
    // For now: if order_type is delivery, we might assume shipping is included in total so we can't easily separate without logic.
    // However, knowing the system, we added shipping cost to total.
    // Let's display the total as is.

    // Sample format uses YYYY-MM-DD
    const orderDate = new Date(order.created_at)

    return (
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

                {/* Simulated 'Hora Ent.' - usually delivery time estimate */}
                {/* <span className="mt-2 text-lg">Hora Ent.:</span>
                <span className="mt-2 text-3xl font-black">22:45</span> */}
            </div>

            <hr className="border-t-2 border-black mb-4" />

            {/* Customer Info */}
            <div className="mb-6 text-sm font-bold leading-snug">
                <div className="mb-2">
                    <span className="font-normal">Cliente: </span>
                    <span className="text-lg">{order.profiles?.full_name || order.order_items?.[0]?.order_id ? 'Cliente #' + order.id.slice(0, 4) : 'Invitado'}</span>
                </div>

                {order.order_type === 'delivery' ? (
                    <div className="mb-2 whitespace-pre-wrap">
                        {order.delivery_address}
                    </div>
                ) : (
                    <div className="mb-2 italic">Retiro en Local</div>
                )}

                {order.profiles?.phone && (
                    <div>Tel: {order.profiles.phone}</div>
                )}
                {/* Fallback for guest phone if stored in metadata or similar, usually logic dependent */}
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
                {/* Ideally we separate delivery cost here if we stored it */}
                {/* <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${order.subtotal}</span>
                </div> 
                <div className="flex justify-between">
                    <span>Delivery:</span>
                    <span>${order.shipping}</span>
                </div> */}

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
                    {/* Logic for "Paga con" would normally come from checkout, for now hidden unless we add that field */}
                    {/* <div>Paga con: $-----</div>
                   <div>Vuelto: $-----</div> */}
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
