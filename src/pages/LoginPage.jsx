import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../supabaseClient'
import { ArrowRight, Loader2, Mail, Lock } from 'lucide-react'

const LoginPage = () => {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [error, setError] = useState(null)

    const handleAuth = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (isSignUp) {
                const { data: signUpData, error } = await supabase.auth.signUp({
                    email,
                    password
                })
                if (error) throw error
                if (signUpData.user) {
                    toast.success('Registro exitoso! Revisa tu email para confirmar.')
                } else {
                    toast.info('Registro iniciado. Por favor, revisa tu email para confirmar tu cuenta.')
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                })
                if (error) throw error
                navigate('/')
            }
        } catch (err) {
            setError(err.message)
            toast.error('Error: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-background)] p-4 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-[#1a1a2e] to-transparent opacity-50 z-0"></div>

            <div className="z-10 w-full max-w-sm">
                {/* Brand Logo Section */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-32 h-32 rounded-full bg-[#1a1a2e] border-4 border-[var(--color-surface)] shadow-2xl flex items-center justify-center mb-6 overflow-hidden relative">
                        <img src="/logo-damaf.png" alt="Damafa" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">DAMAFA</h1>
                    <p className="text-[var(--color-text-muted)] text-center max-w-xs">
                        {isSignUp ? 'Únete al club y disfruta de las mejores hamburguesas.' : '¡Qué bueno verte de nuevo! ¿Sale bajón? 🍔'}
                    </p>
                </div>

                <div className="bg-[var(--color-surface)]/80 backdrop-blur-md p-8 rounded-3xl border border-white/5 shadow-2xl">
                    <form onSubmit={handleAuth} className="space-y-5">
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
                            className="w-full bg-gradient-to-r from-[var(--color-secondary)] to-orange-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-orange-500/25 transition-all flex justify-center items-center gap-2 group transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                                <>
                                    {isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-white/5">
                        <p className="text-[var(--color-text-muted)] text-sm">
                            {isSignUp ? '¿Ya tienes cuenta?' : '¿Primera vez por aquí?'}{' '}
                            <button
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="text-[var(--color-secondary)] font-bold hover:underline ml-1"
                            >
                                {isSignUp ? 'Inicia Sesión' : 'Regístrate'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LoginPage
