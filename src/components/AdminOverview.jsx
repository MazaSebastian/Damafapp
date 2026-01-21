import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Store, DollarSign } from 'lucide-react' // Using Store icon instead of TrendingUp
import OverviewSkeleton from './skeletons/OverviewSkeleton'
import { useStoreStatus } from '../hooks/useStoreStatus'
import WeatherWidget from './WeatherWidget'

const AdminOverview = () => {
    const { isOpen, loading: statusLoading } = useStoreStatus()
    const [cashStatus, setCashStatus] = useState('closed')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        checkCashRegister()
    }, [])

    const checkCashRegister = async () => {
        try {
            const { data } = await supabase
                .from('cash_registers')
                .select('id')
                .eq('status', 'open')
                .single()

            if (data) setCashStatus('open')
            else setCashStatus('closed')

        } catch (error) {
            console.error("Error checking cash register:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading || statusLoading) return <OverviewSkeleton />

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Store Status Card */}
                <div className={`p-8 rounded-2xl border flex items-center justify-between relative overflow-hidden transition-all shadow-lg ${isOpen
                    ? 'bg-green-500/10 border-green-500/20 shadow-green-500/10'
                    : 'bg-red-500/10 border-red-500/20 shadow-red-500/10'
                    }`}>
                    <div>
                        <h4 className="text-[var(--color-text-muted)] text-sm font-bold uppercase tracking-wider mb-2">Estado del Local</h4>
                        <span className={`text-4xl font-black tracking-tight ${isOpen ? 'text-green-400' : 'text-red-400'}`}>
                            {isOpen ? 'ABIERTO' : 'CERRADO'}
                        </span>
                        <div className="mt-2 text-sm text-white/40 font-medium">
                            {isOpen ? 'Operando normalmente' : 'Fuera de horario de atención'}
                        </div>
                    </div>
                    <div className={`p-4 rounded-full ${isOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        <Store className="w-10 h-10" />
                    </div>
                </div>

                {/* Cash Register Status Card */}
                <div className={`p-8 rounded-2xl border flex items-center justify-between relative overflow-hidden transition-all shadow-lg ${cashStatus === 'open'
                    ? 'bg-blue-500/10 border-blue-500/20 shadow-blue-500/10'
                    : 'bg-gray-800/50 border-white/10'
                    }`}>
                    <div>
                        <h4 className="text-[var(--color-text-muted)] text-sm font-bold uppercase tracking-wider mb-2">Estado de Caja</h4>
                        <span className={`text-4xl font-black tracking-tight ${cashStatus === 'open' ? 'text-blue-400' : 'text-gray-400'}`}>
                            {cashStatus === 'open' ? 'CAJA ABIERTA' : 'CAJA CERRADA'}
                        </span>
                        <div className="mt-2 text-sm text-white/40 font-medium">
                            {cashStatus === 'open' ? 'Registrando movimientos' : 'No se pueden cobrar pedidos'}
                        </div>
                    </div>
                    <div className={`p-4 rounded-full ${cashStatus === 'open' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700/50 text-gray-500'}`}>
                        <DollarSign className="w-10 h-10" />
                    </div>
                </div>

            </div>

            {/* Weather Widget Section */}
            <div>
                <WeatherWidget />
            </div>
        </div>
    )
}

export default AdminOverview
