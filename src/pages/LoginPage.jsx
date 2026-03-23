import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../supabaseClient'
import { ArrowRight, Loader2, Mail, Lock } from 'lucide-react'
import { useTenantNav } from '../hooks/useTenantNav'
import { useTenant } from '../context/TenantContext'

const LoginPage = () => {
    const navigate = useNavigate()
    const tenantNav = useTenantNav()
    const { tenantLogo, tenantName } = useTenant()
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })
            if (error) throw error

            // Check role for redirect
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single()

            const role = profile?.role

            if (role === 'admin' || role === 'owner') {
                tenantNav.navigate('/admin')
            } else if (role === 'kitchen') {
                tenantNav.navigate('/kds')
            } else if (role === 'rider' || role === 'driver') {
                tenantNav.navigate('/rider')
            } else {
                tenantNav.navigate('/')
            }
        } catch (err) {
            setError(err.message)
            toast.error('Error: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            toast.warning('Ingresa tu email primero para recuperar tu contraseña')
            return
        }
        const toastId = toast.loading('Enviando link de recuperación...')
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}${tenantNav.path('/login')}`
            })
            if (error) throw error
            toast.success('¡Revisá tu email! Te enviamos un link para restablecer tu contraseña.', { id: toastId, duration: 6000 })
        } catch (err) {
            toast.error('Error: ' + err.message, { id: toastId })
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-background)] p-4 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-[#1a1a2e] to-transparent opacity-50 z-0"></div>

            <div className="z-10 w-full max-w-sm">
                {/* Brand Logo Section */}
                <div className="flex flex-col items-center mb-8">
                    <img src={tenantLogo || '/logo-stacked.png'} alt={tenantName} className="h-24 w-auto drop-shadow-2xl mb-4 hover:scale-105 transition-transform" />
                    <p className="text-[var(--color-text-muted)] text-center max-w-xs">
                        ¡Qué bueno verte de nuevo! 👋
                    </p>
                </div>

                <div className="bg-[var(--color-surface)]/80 backdrop-blur-md p-8 rounded-3xl border border-white/5 shadow-2xl">
                    <form onSubmit={handleLogin} className="space-y-4">

                        {/* Email */}
                        <div className="space-y-2">
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-secondary)] transition-all"
                                    placeholder="tu-email@ejemplo.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-secondary)] transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-[var(--color-secondary)] to-orange-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-orange-500/25 transition-all flex justify-center items-center gap-2 group transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed mt-6"
                        >
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                                <>
                                    Iniciar Sesión
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={handleForgotPassword}
                            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-secondary)] transition-colors mt-2 text-right w-full"
                        >
                            ¿Olvidaste tu contraseña?
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-white/5">
                        <p className="text-[var(--color-text-muted)] text-sm">
                            ¿Primera vez por aquí?{' '}
                            <Link
                                to={tenantNav.path('/register')}
                                className="text-[var(--color-secondary)] font-bold hover:underline ml-1"
                            >
                                Regístrate
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LoginPage
