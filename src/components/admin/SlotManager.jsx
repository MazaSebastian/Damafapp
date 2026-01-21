import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { Loader2, Save, Cloud, Check, Truck, ShoppingBag, Clock, Plus, Trash2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

const SlotManager = () => {
    const [slots, setSlots] = useState([])
    const [loading, setLoading] = useState(true)
    const [newTime, setNewTime] = useState('')

    useEffect(() => {
        fetchSlots()
    }, [])

    const fetchSlots = async () => {
        try {
            const { data, error } = await supabase
                .from('production_slots')
                .select('*')
                .order('start_time', { ascending: true })

            if (error) throw error
            setSlots(data || [])
        } catch (error) {
            console.error('Error fetching slots:', error)
            toast.error('Error al cargar horarios')
        } finally {
            setLoading(false)
        }
    }

    const handleAddSlot = async (e) => {
        e.preventDefault()
        if (!newTime) return toast.warning('Ingresa un horario')

        // Check duplicate
        if (slots.some(s => s.start_time === newTime)) {
            return toast.error('Ya existe un turno con este horario')
        }

        try {
            const newSlot = {
                start_time: newTime,
                max_orders: 5,
                is_delivery: true,
                is_takeaway: true,
                is_active: true
            }

            const { data, error } = await supabase
                .from('production_slots')
                .insert([newSlot])
                .select()
                .single()

            if (error) throw error

            setSlots([...slots, data].sort((a, b) => a.start_time.localeCompare(b.start_time)))
            setNewTime('')
            toast.success('Horario agregado')

        } catch (error) {
            toast.error('Error al agregar: ' + error.message)
        }
    }

    const handleDelete = (id) => {
        toast('¿Eliminar este horario?', {
            action: {
                label: 'Eliminar',
                onClick: async () => {
                    try {
                        const { error } = await supabase
                            .from('production_slots')
                            .delete()
                            .eq('id', id)

                        if (error) throw error

                        setSlots(prev => prev.filter(s => s.id !== id))
                        toast.success('Horario eliminado')
                    } catch (error) {
                        toast.error('Error al eliminar')
                    }
                }
            },
            cancel: {
                label: 'Cancelar',
                onClick: () => { }
            },
            duration: 5000,
        })
    }

    const handleUpdate = async (id, field, value) => {
        // Optimistic Update
        const updatedSlots = slots.map(s => s.id === id ? { ...s, [field]: value } : s)
        setSlots(updatedSlots)

        try {
            const { error } = await supabase
                .from('production_slots')
                .update({ [field]: value })
                .eq('id', id)

            if (error) throw error
        } catch (error) {
            console.error('Update error:', error)
            toast.error('No se pudo guardar el cambio')
            fetchSlots() // Revert
        }
    }

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
                        Define los horarios exactos de entrega disponibles para el cliente.
                    </p>
                </div>
            </div>

            {/* Add New Slot Form */}
            <div className="bg-[var(--color-surface)] p-4 rounded-xl border border-white/10 shadow-lg flex items-center gap-4">
                <div className="bg-blue-500/10 p-2 rounded-lg text-blue-400">
                    <Plus className="w-5 h-5" />
                </div>
                <form onSubmit={handleAddSlot} className="flex-1 flex gap-4 items-center">
                    <span className="text-sm font-bold text-white/60">NUEVO HORARIO:</span>
                    <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="bg-[var(--color-background)] border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-lg outline-none focus:border-[var(--color-primary)]"
                        required
                    />
                    <button
                        type="submit"
                        className="bg-[var(--color-secondary)] hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg active:scale-95"
                    >
                        Agregar
                    </button>
                </form>
            </div>

            {/* List */}
            <div className="bg-[var(--color-surface)] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="grid grid-cols-12 bg-[var(--color-background)]/50 border-b border-white/10 text-[var(--color-text-muted)] uppercase text-[10px] tracking-wider font-bold p-4">
                    <div className="col-span-2 flex items-center">Horario</div>
                    <div className="col-span-3 text-center flex items-center justify-center">Capacidad</div>
                    <div className="col-span-3 text-center flex items-center justify-center">Delivery</div>
                    <div className="col-span-3 text-center flex items-center justify-center">Take Away</div>
                    <div className="col-span-1 text-center flex items-center justify-center">Estado</div>
                </div>

                <div className="divide-y divide-white/5">
                    {slots.length === 0 ? (
                        <div className="p-8 text-center text-white/40 flex flex-col items-center gap-2">
                            <AlertCircle className="w-6 h-6" />
                            <p>No hay horarios configurados. Agrega uno arriba.</p>
                        </div>
                    ) : (
                        slots.map(slot => (
                            <div key={slot.id} className="grid grid-cols-12 p-4 items-center transition-colors hover:bg-white/[0.02]">
                                {/* Time */}
                                <div className="col-span-2 font-mono text-lg font-medium text-white">
                                    {slot.start_time.slice(0, 5)}
                                </div>

                                {/* Capacity */}
                                <div className="col-span-3 flex justify-center">
                                    <div className="flex items-center bg-[var(--color-background)] rounded-lg border border-white/10 p-1">
                                        <button
                                            onClick={() => handleUpdate(slot.id, 'max_orders', Math.max(0, slot.max_orders - 1))}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            value={slot.max_orders}
                                            onChange={(e) => handleUpdate(slot.id, 'max_orders', parseInt(e.target.value) || 0)}
                                            className="w-12 bg-transparent text-center font-bold text-white outline-none appearance-none"
                                        />
                                        <button
                                            onClick={() => handleUpdate(slot.id, 'max_orders', slot.max_orders + 1)}
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
                                        checked={slot.is_delivery}
                                        onChange={(checked) => handleUpdate(slot.id, 'is_delivery', checked)}
                                        activeColor="bg-blue-500"
                                    />
                                </div>

                                {/* Take Away Toggle */}
                                <div className="col-span-3 flex justify-center">
                                    <Switch
                                        label="TakeAway"
                                        icon={<ShoppingBag className="w-4 h-4" />}
                                        checked={slot.is_takeaway}
                                        onChange={(checked) => handleUpdate(slot.id, 'is_takeaway', checked)}
                                        activeColor="bg-green-500"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="col-span-1 flex justify-center">
                                    <button
                                        onClick={() => handleDelete(slot.id)}
                                        className="p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Eliminar horario"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
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
