import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Plus, Search, MapPin, Phone, MessageCircle, Truck, Trash2, Edit, X } from 'lucide-react'
import { toast } from 'sonner'

const DriversManager = () => {
    const [drivers, setDrivers] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [newDriver, setNewDriver] = useState({ name: '', phone: '' })

    useEffect(() => {
        fetchDrivers()
    }, [])

    const fetchDrivers = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('drivers')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching drivers:', error)
            toast.error('Error al cargar repartidores')
        } else {
            setDrivers(data || [])
        }
        setLoading(false)
    }

    const handleCreateDriver = async (e) => {
        e.preventDefault()
        if (!newDriver.name) return toast.error('El nombre es obligatorio')

        const { error } = await supabase
            .from('drivers')
            .insert([{ name: newDriver.name, phone: newDriver.phone, status: 'active' }])

        if (error) {
            toast.error('Error al crear repartidor')
        } else {
            toast.success('Repartidor creado exitosamente')
            setShowModal(false)
            setNewDriver({ name: '', phone: '' })
            fetchDrivers()
        }
    }

    const handleDeleteDriver = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este repartidor?')) return

        const { error } = await supabase
            .from('drivers')
            .delete()
            .eq('id', id)

        if (error) {
            toast.error('Error al eliminar')
        } else {
            toast.success('Repartidor eliminado')
            fetchDrivers()
        }
    }

    const filteredDrivers = drivers.filter(driver =>
        driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (driver.phone && driver.phone.includes(searchTerm))
    )

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Repartidores</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-[var(--color-primary)] hover:opacity-90 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all shadow-lg shadow-purple-900/20"
                    >
                        <Plus className="w-4 h-4" />
                        NUEVO REPARTIDOR
                    </button>
                    {/* Placeholder for Assign to Zones */}
                    <button
                        className="bg-[var(--color-surface)] hover:bg-white/5 text-[var(--color-text-main)] px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-colors border border-white/10"
                    >
                        ASIGNAR REPARTIDOR A ZONAS
                    </button>
                </div>
            </div>

            <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-white/5 shadow-xl">
                {/* Search */}
                <div className="mb-6">
                    <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 block">Buscar en repartidores:</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                        <input
                            type="text"
                            placeholder="Nombre, teléfono..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full md:w-1/3 bg-[var(--color-background)] border border-white/5 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-text-main)] outline-none transition-all placeholder-white/20 text-sm"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--color-background)]/50 uppercase text-xs">
                            <tr>
                                <th className="py-3 px-4 font-bold text-[var(--color-text-main)] rounded-l-lg">Nombre</th>
                                <th className="py-3 px-4 font-bold text-[var(--color-text-main)]">Teléfono</th>
                                <th className="py-3 px-4 font-bold text-[var(--color-text-main)]">Pedido</th>
                                <th className="py-3 px-4 font-bold text-[var(--color-text-main)]">Última dirección</th>
                                <th className="py-3 px-4 font-bold text-[var(--color-text-main)] text-right rounded-r-lg">Accion</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan="5" className="text-center py-8 text-[var(--color-text-muted)]">Cargando...</td></tr>
                            ) : filteredDrivers.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-8 text-[var(--color-text-muted)]">No hay repartidores encontrados</td></tr>
                            ) : (
                                filteredDrivers.map((driver, index) => (
                                    <tr key={driver.id} className="hover:bg-white/5 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[var(--color-text-muted)] font-mono text-xs w-4">{index + 1}</span>
                                                <span className="font-bold text-white">{driver.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-[var(--color-text-muted)] font-mono">{driver.phone || '-'}</td>
                                        <td className="py-3 px-4">
                                            {driver.current_order_id ? (
                                                <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs font-bold border border-blue-500/20">
                                                    #{driver.current_order_id.toString().slice(0, 6)}
                                                </span>
                                            ) : (
                                                <span className="text-[var(--color-text-muted)]">-</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-[var(--color-text-muted)] truncate max-w-[200px]">
                                            {driver.last_location || <span className="text-white/20 italic">Sin ubicación</span>}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex justify-end gap-2">
                                                <ActionButton icon={<MessageCircle className="w-4 h-4" />} color="bg-green-500/20 text-green-400 hover:bg-green-500/30" onClick={() => window.open(`https://wa.me/${driver.phone}`, '_blank')} disabled={!driver.phone} />
                                                <ActionButton icon={<MapPin className="w-4 h-4" />} color="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" />
                                                <ActionButton icon={<Edit className="w-4 h-4" />} color="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30" />
                                                <ActionButton icon={<Trash2 className="w-4 h-4" />} color="bg-red-500/20 text-red-400 hover:bg-red-500/30" onClick={() => handleDeleteDriver(driver.id)} />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Create */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--color-surface)] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Nuevo Repartidor</h3>
                            <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateDriver} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-[var(--color-background)] border border-white/5 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-white placeholder-white/20"
                                    value={newDriver.name}
                                    onChange={e => setNewDriver({ ...newDriver, name: e.target.value })}
                                    placeholder="Nombre del repartidor"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1">Teléfono</label>
                                <input
                                    type="tel"
                                    className="w-full bg-[var(--color-background)] border border-white/5 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-white placeholder-white/20"
                                    value={newDriver.phone}
                                    onChange={e => setNewDriver({ ...newDriver, phone: e.target.value })}
                                    placeholder="Ej: 54911..."
                                />
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 rounded-xl font-bold text-[var(--color-text-muted)] hover:bg-white/5 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-[var(--color-primary)] hover:opacity-90 text-white py-3 rounded-xl font-bold shadow-lg shadow-purple-900/20 transition-all"
                                >
                                    Guardar Repartidor
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

const ActionButton = ({ icon, color, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`${color} w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
    >
        {icon}
    </button>
)

export default DriversManager
