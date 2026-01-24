import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { X, Check, Truck } from 'lucide-react'
import { toast } from 'sonner'

const AssignDriverModal = ({ isOpen, onClose, orderId, onAssignSuccess }) => {
    const [drivers, setDrivers] = useState([])
    const [selectedDriverId, setSelectedDriverId] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            fetchDrivers()
            setSelectedDriverId('') // Reset selection
        }
    }, [isOpen])

    const fetchDrivers = async () => {
        const { data, error } = await supabase
            .from('drivers')
            .select('*')
            .eq('status', 'active') // Only active drivers?
            .order('name', { ascending: true })

        if (data) setDrivers(data)
    }

    const handleAssign = async () => {
        if (!selectedDriverId) return toast.error('Selecciona un repartidor')

        setLoading(true)
        const { error } = await supabase
            .from('orders')
            .update({ driver_id: selectedDriverId })
            .eq('id', orderId)

        if (error) {
            console.error(error)
            console.error(error)
            toast.error('Error: ' + (error.message || 'Al asignar repartidor'))
        } else {
            toast.success('Repartidor asignado correctamente')
            onAssignSuccess()
            onClose()
        }
        setLoading(false)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--color-surface)] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Truck className="text-[var(--color-primary)]" />
                        Asignar pedido
                    </h3>
                    <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="bg-[var(--color-background)] p-3 rounded-lg border border-white/5 text-center">
                        <span className="text-[var(--color-text-muted)] text-xs uppercase font-bold">Pedido N°</span>
                        <div className="text-lg font-mono font-bold text-white">#{orderId?.slice(0, 8)}</div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-2">Seleccionar Repartidor</label>
                        <select
                            value={selectedDriverId}
                            onChange={(e) => setSelectedDriverId(e.target.value)}
                            className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-white appearance-none cursor-pointer"
                        >
                            <option value="">- Seleccione un repartidor -</option>
                            {drivers.map(driver => (
                                <option key={driver.id} value={driver.id}>
                                    {driver.name} {driver.phone ? `(${driver.phone})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl font-bold text-[var(--color-text-muted)] hover:bg-white/5 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleAssign}
                            disabled={loading}
                            className="flex-1 bg-[var(--color-primary)] hover:opacity-90 text-white py-3 rounded-xl font-bold shadow-lg shadow-purple-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : 'Asignar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AssignDriverModal
