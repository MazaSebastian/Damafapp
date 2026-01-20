import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { UtensilsCrossed, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import { toast } from 'sonner'
import LoyaltyBanner from './LoyaltyBanner'
import NewsCard from './NewsCard'
import BottomNav from './BottomNav'
import FloatingOrderButton from './FloatingOrderButton'
import { NewsSkeleton } from './skeletons/NewsSkeleton'
import StoreInfoHeader from './StoreInfoHeader'

const UserHome = () => {
    const { user, profile, role, signOut } = useAuth()
    const [news, setNews] = useState([])
    const [loading, setLoading] = useState(true)

    // Use stars from global profile if available
    const stars = profile?.stars || 0

    console.log('UserHome Render. Loading:', loading, 'Stars:', stars)

    // ... useEffect remains the same ...

    useEffect(() => {
        let mounted = true

        // Timeout force show
        const timeout = setTimeout(() => {
            if (mounted && loading) {
                console.warn('Home news loading timed out - Forcing display')
                setLoading(false)
            }
        }, 3000)

        const fetchNews = async () => {
            try {
                console.log('Fetching news...')
                const { data: newsData, error: newsError } = await supabase
                    .from('news_events')
                    .select('*')
                    .order('created_at', { ascending: false })

                if (newsError) throw newsError

                if (newsData && mounted) {
                    setNews(newsData)
                }
            } catch (error) {
                console.error('Error fetching news:', error)
            } finally {
                if (mounted) setLoading(false)
            }
        }

        fetchNews()

        return () => {
            mounted = false
            clearTimeout(timeout)
        }
    }, [])

    return (
        <div className="min-h-screen bg-[var(--color-background)] pb-24">

            {/* Top Header */}
            <header className="px-4 py-6 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-3">
                    <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-white/10 flex items-center justify-center text-xl">
                            {profile?.full_name ? profile.full_name[0] : '👤'}
                        </div>
                        <div>
                            <h1 className="text-sm font-bold leading-tight">Hola, {profile?.full_name?.split(' ')[0] || 'Vecino'}!</h1>
                            <p className="text-[10px] text-[var(--color-text-muted)]">Ver Mi Perfil &gt;</p>
                        </div>
                    </Link>
                </div>

                {/* Admin Link or Sign Out */}
                <div className="flex gap-2 items-center relative z-20">
                    {role === 'admin' && (
                        <Link to="/admin" className="text-white text-[10px] font-bold px-3 py-1.5 rounded-full bg-[var(--color-primary)] hover:bg-purple-700 transition-colors border border-transparent uppercase tracking-wider">
                            Admin
                        </Link>
                    )}
                    <button
                        onClick={async () => {
                            const toastId = toast.loading('Cerrando sesión...')
                            try {
                                await signOut()
                                toast.dismiss(toastId)
                            } catch (error) {
                                toast.error('Error al salir', { id: toastId })
                            }
                        }}
                        className="text-white/80 text-[10px] font-bold px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/5 uppercase tracking-wider"
                    >
                        Salir
                    </button>
                </div>
            </header>

            {/* Store Info Header */}
            <div className="pt-2">
                <StoreInfoHeader />
            </div>

            {/* Main Content */}
            <main className="px-4 max-w-lg mx-auto pt-2">
                <LoyaltyBanner stars={stars} />

                {/* News Feed */}
                {loading ? (
                    <NewsSkeleton />
                ) : (
                    news.map(item => <NewsCard key={item.id} item={item} />)
                )}
            </main>

            <BottomNav />
            <FloatingOrderButton />
        </div>
    )
}

export default UserHome
