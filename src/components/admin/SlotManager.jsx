import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { Loader2, Save, Cloud, Check, Truck, ShoppingBag, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { addMinutes, format, parse } from 'date-fns'

const SlotManager = () => {
    const [slotsMap, setSlotsMap] = useState({}) // { '20:30': { ...data } }
    const [loading, setLoading] = useState(true)

    // Configuration for the checklist generation
    const START_TIME = '20:30'
    const END_TIME = '23:30'
    const INTERVAL_MIN = 15

    useEffect(() => {
        fetchSlots()
    }, [])

    const fetchSlots = async () => {
        try {
            const { data, error } = await supabase
                .from('production_slots')
                .select('*')

            if (error) throw error

            // Map by start_time for easy lookup
            const map = {}
            data.forEach(slot => {
                // slot.start_time is usually HH:mm:ss, we want HH:mm
                const timeKey = slot.start_time.slice(0, 5)
                map[timeKey] = slot
            })
            setSlotsMap(map)

        } catch (error) {
            console.error('Error fetching slots:', error)
            toast.error('Error al cargar horarios')
        } finally {
            setLoading(false)
        }
    }

    // Generate static list of times
    const generateTimeSlots = () => {
        const slots = []
        let current = parse(START_TIME, 'HH:mm', new Date())
        const end = parse(END_TIME, 'HH:mm', new Date())

        while (current <= end) {
            slots.push(format(current, 'HH:mm'))
            current = addMinutes(current, INTERVAL_MIN)
        }
        return slots
    }

    const handleUpdate = async (time, field, value) => {
        // Optimistic UI Update
        const currentData = slotsMap[time] || {
            start_time: time,
            max_orders: 5,
            is_delivery: false, // Default off until interacted
            is_takeaway: false
        }

        const newData = { ...currentData, [field]: value }

        // Update local state immediately
        setSlotsMap(prev => ({
            ...prev,
            [time]: newData
        }))

        try {
            // Upsert to DB
            // We need to send the ID if it exists to update, or just match by start_time?
            // Since we might not have a unique constraint on start_time in DB schema yet,
            // safest is to use ID if we have it. If not, we insert.
            // Actually, for "checklist" style, start_time IS the key.
            // Let's assume we want one row per time.

            const payload = {
                start_time: time,
                max_orders: newData.max_orders,
                is_delivery: newData.is_delivery,
                is_takeaway: newData.is_takeaway,
                // Preserve ID if it exists
                ...(currentData.id ? { id: currentData.id } : {})
            }

            const { data, error } = await supabase
                .from('production_slots')
                .upsert(payload, { onConflict: 'id' }) // Ideally on start_time if unique, but let's rely on ID management or logic
                .select()
                .single()

            if (error) throw error

            // Update map with returned data (to get the new ID if inserted)
            setSlotsMap(prev => ({
                ...prev,
                [time]: { ...newData, id: data.id }
            }))

        } catch (error) {
            console.error('Error updating slot:', error)
            toast.error('Error al guardar cambio')
            // Revert state? For now keep simple.
        }
    }

    const timeSlots = generateTimeSlots()

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[var(--color-primary)]" /></div>

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Clock className="text-[var(--color-primary)]" />
                        Horarios y Cupos
                    </h2>
                    <p className="text-[var(--color-text-muted)] text-sm mt-1">
                        Gestiona ágilmente la disponibilidad de cada turno. Los cambios se guardan automáticamente.
                    </p>
                </div>
                <div className="bg-[var(--color-surface)] px-4 py-2 rounded-lg border border-white/5 flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]">
                    <Cloud className="w-4 h-4" />
                    <span>Autoguardado activo</span>
                </div>
            </div>

            <div className="bg-[var(--color-surface)] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="grid grid-cols-12 bg-[var(--color-background)]/50 border-b border-white/10 text-[var(--color-text-muted)] uppercase text-[10px] tracking-wider font-bold p-4">
                    <div className="col-span-2 flex items-center">Horario</div>
                    <div className="col-span-3 text-center flex items-center justify-center">Capacidad</div>
                    <div className="col-span-3 text-center flex items-center justify-center">Delivery</div>
                    <div className="col-span-3 text-center flex items-center justify-center">Take Away</div>
                    <div className="col-span-1 text-center flex items-center justify-center">Estado</div>
                </div>

                <div className="divide-y divide-white/5">
                    {timeSlots.map(time => {
                        const slot = slotsMap[time] || {}
                        const isActive = slot.id && (slot.is_delivery || slot.is_takeaway)

                        return (
                            <div key={time} className={`grid grid-cols-12 p-4 items-center transition-colors hover:bg-white/[0.02] ${isActive ? 'bg-green-500/[0.01]' : ''}`}>
                                {/* Time */}
                                <div className="col-span-2 font-mono text-lg font-medium text-white">
                                    {time}
                                </div>

                                {/* Capacity */}
                                <div className="col-span-3 flex justify-center">
                                    <div className="flex items-center bg-[var(--color-background)] rounded-lg border border-white/10 p-1">
                                        <button
                                            onClick={() => handleUpdate(time, 'max_orders', Math.max(0, (slot.max_orders || 5) - 1))}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            value={slot.max_orders || 5}
                                            onChange={(e) => handleUpdate(time, 'max_orders', parseInt(e.target.value) || 0)}
                                            className="w-12 bg-transparent text-center font-bold text-white outline-none appearance-none"
                                        />
                                        <button
                                            onClick={() => handleUpdate(time, 'max_orders', (slot.max_orders || 5) + 1)}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Delivery Toggle */}
                                <div className="col-span-3 flex justify-center">
                                    <Switch
                                        label="Delivery"
                                        icon={<Truck className="w-4 h-4" />}
                                        checked={!!slot.is_delivery}
                                        onChange={(checked) => handleUpdate(time, 'is_delivery', checked)}
                                        activeColor="bg-blue-500"
                                    />
                                </div>

                                {/* Take Away Toggle */}
                                <div className="col-span-3 flex justify-center">
                                    <Switch
                                        label="TakeAway"
                                        icon={<ShoppingBag className="w-4 h-4" />}
                                        checked={!!slot.is_takeaway}
                                        onChange={(checked) => handleUpdate(time, 'is_takeaway', checked)}
                                        activeColor="bg-green-500"
                                    />
                                </div>

                                {/* Status Indicator */}
                                <div className="col-span-1 flex justify-center">
                                    {isActive ? (
                                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                                    ) : (
                                        <div className="w-2 h-2 rounded-full bg-white/10"></div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

// Mini UI Switch Component
const Switch = ({ checked, onChange, activeColor, icon, label }) => (
    <button
        onClick={() => onChange(!checked)}
        className={`
            relative group flex items-center gap-3 px-3 py-2 rounded-xl border transition-all duration-300 w-32
            ${checked
                ? `${activeColor} border-transparent text-white shadow-lg`
                : 'bg-[var(--color-background)] border-white/10 text-[var(--color-text-muted)] hover:border-white/20'
            }
        `}
    >
        <div className={`p-1 rounded-full ${checked ? 'bg-white/20' : 'bg-white/5'}`}>
            {icon}
        </div>
        <span className="text-xs font-bold uppercase tracking-wide">{checked ? 'ON' : 'OFF'}</span>

        {/* Toggle Circle */}
        <div className={`
            absolute right-3 w-2 h-2 rounded-full transition-all duration-300
            ${checked ? 'bg-white scale-125' : 'bg-white/10'}
        `} />
    </button>
)

export default SlotManager
