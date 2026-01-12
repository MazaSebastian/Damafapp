import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../supabaseClient'
import { ChefHat, ArrowRight, Loader2 } from 'lucide-react'

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
                    // This case might occur if email confirmation is required but no user object is returned immediately
                    // Or if there's an issue not caught by the 'error' object
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
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-[var(--color-background)] p-4 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-[var(--color-primary)]/10 -skew-y-6 transform origin-top-left z-0"></div>

            <div className="z-10 w-full max-w-md bg-[var(--color-surface)] p-8 rounded-2xl shadow-2xl border border-[var(--color-primary)]/20 animate-fade-in-up">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-[var(--color-secondary)] p-3 rounded-xl mb-4 shadow-lg shadow-orange-500/20">
                        <ChefHat className="text-white w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--color-text-main)]">
                        {isSignUp ? 'Join the Club' : 'Welcome Back'}
                    </h2>
                    <p className="text-[var(--color-text-muted)] text-sm mt-1">
                        {isSignUp ? 'Create an account to start ordering' : 'Sign in to your account'}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase text-[var(--color-text-muted)] mb-1 ml-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[var(--color-background)] border border-[var(--color-primary)]/30 text-[var(--color-text-main)] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] transition-all placeholder:text-slate-600"
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase text-[var(--color-text-muted)] mb-1 ml-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[var(--color-background)] border border-[var(--color-primary)]/30 text-[var(--color-text-main)] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] transition-all placeholder:text-slate-600"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[var(--color-secondary)] hover:bg-orange-600 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-orange-500/20 transition-all flex justify-center items-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                            <>
                                {isSignUp ? 'Sign Up' : 'Log In'}
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-[var(--color-text-muted)] text-sm">
                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-[var(--color-secondary)] font-semibold hover:underline"
                        >
                            {isSignUp ? 'Log In' : 'Sign Up'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default LoginPage
