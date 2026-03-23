import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { UtensilsCrossed, Loader2 } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'
import { useAuth } from '../context/AuthContext'
import { useTenantNav } from '../hooks/useTenantNav'
import { useTenant } from '../context/TenantContext'
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
    const { isHydrated } = useSettings()
    const tenantNav = useTenantNav()
    const { tenantId } = useTenant()
    const [news, setNews] = useState([])
    const [loading, setLoading] = useState(true)

    const stars = profile?.stars || 0

    useEffect(() => {
        // Wait for hydration (Settings loaded) before fetching News
        if (!isHydrated) return

        let mounted = true
        const controller = new AbortController()

        const fetchNews = async () => {
            const timeoutId = setTimeout(() => controller.abort(), 3500)

            try {
                const { data: newsData, error: newsError } = await supabase
                    .from('news_events')
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .order('created_at', { ascending: false })
                    .abortSignal(controller.signal)

                if (newsError) throw newsError

                if (newsData && mounted) {
                    setNews(newsData)
                }
            } catch (error) {
                const isAbort = error.name === 'AbortError' || error.message?.includes('AbortError')
                if (!isAbort) {
                    console.error('Error fetching news:', error)
                }
            } finally {
                clearTimeout(timeoutId)
                if (mounted) setLoading(false)
            }
        }

        fetchNews()

        return () => {
            mounted = false
            controller.abort()
        }
    }, [isHydrated])

    return (
        <div className="min-h-screen bg-[var(--color-background)] pb-24">

            {/* Top Header */}
            <header className="px-4 py-6 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-3">
                    <Link to={tenantNav.path('/profile')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-white/10 flex items-center justify-center text-xl">
                            {profile?.full_name ? profile.full_name[0] : '👤'}
                        </div>
                        <div>
                            <h1 className="text-sm font-bold leading-tight">
                                {profile?.full_name || user?.user_metadata?.name
                                    ? `Hola, ${(profile?.full_name || user?.user_metadata?.name).split(' ')[0]}!`
                                    : '¡Hola!'}
                            </h1>
                            <p className="text-[10px] text-[var(--color-text-muted)]">Ver Mi Perfil &gt;</p>
                        </div>
                    </Link>
                </div>

                {/* Admin Link or Sign Out */}
                <div className="flex gap-2 items-center relative z-20">
                    {role === 'admin' && (
                        <Link to={tenantNav.path('/admin')} className="text-white text-[10px] font-bold px-3 py-1.5 rounded-full bg-[var(--color-primary)] hover:bg-purple-700 transition-colors border border-transparent uppercase tracking-wider">
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
                ) : news.length > 0 ? (
                    news.map(item => <NewsCard key={item.id} item={item} />)
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 opacity-50">
                        <UtensilsCrossed className="w-12 h-12 mb-2 text-white/50" />
                        <p className="text-sm font-bold">No hay promociones activas</p>
                    </div>
                )}
            </main>

            <BottomNav />
            <FloatingOrderButton />
        </div>
    )
}

export default UserHome
