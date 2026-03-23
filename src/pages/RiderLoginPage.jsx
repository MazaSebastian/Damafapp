import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Bike, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTenantNav } from '../hooks/useTenantNav'
import { useTenant } from '../context/TenantContext'

const RiderLoginPage = () => {
    const [pin, setPin] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const tenantNav = useTenantNav()
    const { tenantName } = useTenant()

    const handleLogin = async (e) => {
        e.preventDefault()
        if (pin.length < 4) return toast.error('El PIN debe tener al menos 4 dígitos')

        setLoading(true)

        try {
            // Find driver by PIN
            const { data, error } = await supabase
                .from('drivers')
                .select('*')
                .eq('pin_code', pin)
                .eq('status', 'active') // Only active drivers
                .single()

            if (error || !data) {
                toast.error('PIN incorrecto o conductor no activo')
            } else {
                toast.success(`Bienvenido, ${data.name}! 🚀`)
                // Persist Session (Simple ID storage for now)
                localStorage.setItem('stacked_driver_id', data.id)
                localStorage.setItem('stacked_driver_name', data.name)
                tenantNav.navigate('/rider')
            }
        } catch (err) {
            console.error(err)
            toast.error('Error al iniciar sesión')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-center p-6 text-white font-sans">
            <div className="w-full max-w-sm">
                <div className="mb-10 text-center">
                    <div className="mx-auto bg-[var(--color-primary)] w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-purple-900/40 rotate-3">
                        <Bike className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-black mb-2 tracking-tight">{tenantName} Drivers</h1>
                    <p className="text-[var(--color-text-muted)]">Ingresa tu PIN para comenzar tu turno</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1">
                            PIN de Acceso
                        </label>
                        <input
                            type="password"
                            inputMode="numeric"
                            autoFocus
                            maxLength={6}
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} // Only numbers
                            className="w-full bg-[var(--color-surface)] border border-white/10 rounded-2xl py-4 px-6 text-center text-3xl font-bold tracking-[0.5em] outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-purple-500/10 transition-all shadow-xl placeholder-white/5"
                            placeholder="••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || pin.length < 4}
                        className="w-full bg-[var(--color-primary)] hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-bold py-4 rounded-2xl shadow-lg shadow-purple-900/30 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                        {loading ? <Loader2 className="animate-spin w-6 h-6" /> : (
                            <>
                                Ingresar <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-12 text-center">
                    <p className="text-xs text-white/30">
                        ¿Olvidaste tu PIN? Contacta a administración.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default RiderLoginPage
