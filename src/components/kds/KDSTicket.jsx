import { useState, useEffect } from 'react'
import { Clock, Check, MoreVertical } from 'lucide-react'
import { formatDistanceToNow, differenceInMinutes } from 'date-fns'
import { es } from 'date-fns/locale'

const KDSTicket = ({ order, onAdvanceStatus }) => {
    const [elapsedMinutes, setElapsedMinutes] = useState(0)
    const [checkedItems, setCheckedItems] = useState({})

    useEffect(() => {
        // Initial calc
        updateTimer()

        // Interval
        const interval = setInterval(updateTimer, 60000) // Update every minute
        return () => clearInterval(interval)
    }, [order.created_at])

    const updateTimer = () => {
        setElapsedMinutes(differenceInMinutes(new Date(), new Date(order.created_at)))
    }

    const toggleItem = (itemId) => {
        setCheckedItems(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }))
    }

    const allItemsChecked = order.order_items?.every(item => checkedItems[item.id])

    // Timer Colors
    let timerColor = 'text-green-400'
    let borderColor = 'border-green-500/30'
    let bgPulse = ''

    if (elapsedMinutes >= 10) {
        timerColor = 'text-yellow-400'
        borderColor = 'border-yellow-500/30'
    }
    if (elapsedMinutes >= 20) {
        timerColor = 'text-red-500'
        borderColor = 'border-red-500'
        bgPulse = 'animate-pulse'
    }

    return (
        <div className={`bg-[var(--color-surface)] rounded-xl border-l-4 ${borderColor} ${elapsedMinutes >= 20 ? 'shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'shadow-lg'} flex flex-col h-full min-w-[300px] max-w-[350px] flex-shrink-0 snap-start`}>
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl font-black">#{order.id.slice(0, 4)}</span>
                        {order.status === 'cooking' && (
                            <span className="bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase animate-pulse">
                                Cocinando
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)] font-medium">
                        {order.profiles?.full_name || 'Invitado'}
                    </div>
                </div>
                <div className={`font-mono text-xl font-bold flex items-center gap-1 ${timerColor}`}>
                    <Clock className="w-4 h-4" />
                    {elapsedMinutes}m
                </div>
            </div>

            {/* Items */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                {order.order_items?.map(item => (
                    <div
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${checkedItems[item.id]
                                ? 'bg-green-500/10 border-green-500/20 opacity-50'
                                : 'bg-[var(--color-background)] border-white/5 hover:border-white/20'
                            }`}
                    >
                        <div className="flex justify-between items-center mb-1">
                            <span className={`font-bold text-lg leading-tight ${checkedItems[item.id] ? 'line-through text-white/50' : 'text-white'}`}>
                                1x {item.products.name}
                            </span>
                            {checkedItems[item.id] && <Check className="w-5 h-5 text-green-500" />}
                        </div>
                        {/* Variations */}
                        {item.modifiers?.length > 0 && (
                            <div className="text-sm text-[var(--color-text-muted)] pl-2 border-l-2 border-white/10 mt-1">
                                {item.modifiers.map(m => m.name).join(', ')}
                            </div>
                        )}
                        {item.side_info && <div className="text-sm text-yellow-500/80 font-medium pl-2 mt-1">• {item.side_info.name}</div>}
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-white/5 bg-white/5">
                {order.status === 'pending' ? (
                    <button
                        onClick={() => onAdvanceStatus(order.id, 'cooking')}
                        className="w-full py-4 rounded-xl bg-[var(--color-secondary)] text-white font-black text-lg uppercase tracking-wider hover:bg-orange-600 transition-colors shadow-lg"
                    >
                        EMPEZAR
                    </button>
                ) : (
                    <button
                        onClick={() => onAdvanceStatus(order.id, 'packaging')} // Or 'ready' depending on flow
                        className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-wider transition-colors shadow-lg flex items-center justify-center gap-2 ${allItemsChecked
                                ? 'bg-green-600 hover:bg-green-500 text-white'
                                : 'bg-white/10 text-white/50 hover:bg-white/20'
                            }`}
                    >
                        {allItemsChecked ? 'DESPACHAR' : 'MARCAR LISTO'}
                    </button>
                )}
            </div>
        </div>
    )
}

export default KDSTicket
