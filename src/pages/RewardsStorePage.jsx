import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Star, Lock, ChefHat, ArrowLeft, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import BottomNav from '../components/BottomNav'

const RewardsStorePage = () => {
    const { user } = useAuth()
    const [stars, setStars] = useState(0)
    const [rewards, setRewards] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            if (user) {
                // Fetch Stars
                const { data: profile } = await supabase.from('profiles').select('stars').eq('id', user.id).single()
                if (profile) setStars(profile.stars || 0)
            }

            // Fetch Rewards
            const { data: rewardsData } = await supabase.from('rewards').select('*').eq('active', true).order('cost', { ascending: true })
            if (rewardsData) setRewards(rewardsData)

            setLoading(false)
        }
        fetchData()
    }, [user])

    const handleRedeem = async (item) => {
        if (stars < item.cost) return
        if (!confirm(`¿Canjear "${item.name}" por ${item.cost} Estrellas?`)) return

        setLoading(true)
        const { data, error } = await supabase.rpc('redeem_reward', { reward_id_input: item.id })
        setLoading(false)

        if (error) {
            toast.error('Error al canjear: ' + error.message)
        } else if (!data.success) {
            toast.error(data.message)
        } else {
            toast.success('¡Canje exitoso! 🎉', {
                description: `Tu código de canje es: ${data.redemption_id.slice(0, 8)}. (Muéstralo en el mostrador)`,
                duration: 10000
            })
            setStars(prev => prev - item.cost) // Optimistic update
        }
    }

    return (
        <div className="min-h-screen bg-[var(--color-background)] pb-24">
            {/* Header with Back Button */}
            <header className="p-4 flex items-center justify-between sticky top-0 bg-[var(--color-background)]/90 backdrop-blur-md z-40 border-b border-white/5">
                <Link to="/" className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div className="flex items-center gap-1">
                    <span className="font-bold text-lg">TIENDA</span>
                    <span className="text-[var(--color-secondary)] font-bold text-lg">CLUB</span>
                </div>
                <div className="flex items-center gap-1 bg-[var(--color-surface)] px-3 py-1 rounded-full border border-[var(--color-secondary)]/30">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="font-bold">{stars}</span>
                </div>
            </header>

            <main className="px-4 pt-6 max-w-lg mx-auto">
                {/* Hero / Status */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto bg-[var(--color-surface)] rounded-full flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(214,67,34,0.3)] border border-[var(--color-secondary)]/20">
                        <ChefHat className="w-10 h-10 text-[var(--color-secondary)]" />
                    </div>
                    <h1 className="text-2xl font-bold mb-1">¡Canjea tus Estrellas!</h1>
                    <p className="text-[var(--color-text-muted)] text-sm">Elige tu premio y disfruta del sabor del éxito.</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-secondary)]" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {rewards.map((item) => {
                            const locked = stars < item.cost
                            const diff = item.cost - stars

                            return (
                                <div key={item.id} className={`bg-[var(--color-surface)] rounded-xl overflow-hidden border ${locked ? 'border-white/5 opacity-70' : 'border-[var(--color-secondary)]/50 shadow-lg shadow-orange-900/10'} relative group`}>
                                    <div className="h-32 bg-black/40 relative">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.name} className={`w-full h-full object-cover ${locked ? 'grayscale' : ''}`} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-3xl">🍔</div>
                                        )}

                                        {locked && (
                                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-2 text-center">
                                                <Lock className="w-6 h-6 mb-1 text-gray-400" />
                                                <span className="text-[10px] font-bold uppercase tracking-wide">Faltan {diff}</span>
                                            </div>
                                        )}

                                        <div className="absolute top-2 right-2 bg-black/80 text-yellow-500 text-xs font-bold px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1 border border-yellow-500/20">
                                            <Star className="w-3 h-3 fill-current" /> {item.cost}
                                        </div>
                                    </div>

                                    <div className="p-3">
                                        <h3 className="font-bold text-sm leading-tight mb-3 h-8 line-clamp-2">{item.name}</h3>
                                        <button
                                            onClick={() => handleRedeem(item)}
                                            disabled={locked}
                                            className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${locked ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-[var(--color-secondary)] text-white hover:bg-orange-600 shadow-md transform active:scale-95'}`}
                                        >
                                            {locked ? 'Bloqueado' : 'CANJEAR'}
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {rewards.length === 0 && !loading && (
                    <div className="text-center py-10 opacity-50">
                        <p>No hay premios disponibles por ahora.</p>
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    )
}

export default RewardsStorePage
