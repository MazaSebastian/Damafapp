import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UtensilsCrossed, Loader2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useTenantNav } from '../hooks/useTenantNav'
import { useTenant } from '../context/TenantContext'
import NewsCard from './NewsCard'
import BottomNav from './BottomNav'
import FloatingOrderButton from './FloatingOrderButton'
import { NewsSkeleton } from './skeletons/NewsSkeleton'
import StoreInfoHeader from './StoreInfoHeader'
import LockedLoyaltyBanner from './LockedLoyaltyBanner'

const LandingPage = () => {
    const [news, setNews] = useState([])
    const [loading, setLoading] = useState(true)
    const tenantNav = useTenantNav()
    const { tenantId } = useTenant()

    useEffect(() => {
        if (!tenantId) return

        const fetchNews = async () => {
            const { data, error } = await supabase
                .from('news_events')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false })

            if (!error && data) {
                setNews(data)
            }
            setLoading(false)
        }

        fetchNews()
    }, [tenantId])

    return (
        <div className="min-h-screen bg-[var(--color-background)] pb-20"> {/* pb-20 for bottom nav */}

            {/* Top Bar */}
            {/* Top Bar - Minimal */}
            <header className="fixed top-0 w-full z-50 px-4 py-4 flex justify-end items-center gap-2">
                <Link to={tenantNav.path('/login')} className="text-white/80 text-xs font-bold px-4 py-2 hover:text-white transition-colors uppercase tracking-wider">
                    Iniciar Sesión
                </Link>
                <Link to={tenantNav.path('/register')} className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-white/20 transition-colors uppercase tracking-wider shadow-lg">
                    Registrarse
                </Link>
            </header>

            {/* Main Content with Store Info */}
            <div className="pt-16 pb-6">
                <StoreInfoHeader />

                {/* Locked Welcome Banner */}
                <div className="px-4 max-w-lg mx-auto">
                    <LockedLoyaltyBanner />
                </div>
            </div>

            {/* Main Feed */}
            <main className="px-4 max-w-lg mx-auto">
                {loading ? (
                    <NewsSkeleton />
                ) : (
                    news.map(item => (
                        <NewsCard key={item.id} item={item} />
                    ))
                )}
            </main>

            {/* Bottom Navigation */}
            <BottomNav />
            <FloatingOrderButton />
        </div>
    )
}

export default LandingPage

