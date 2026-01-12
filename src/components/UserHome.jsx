import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Menu, UtensilsCrossed, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import LoyaltyBanner from './LoyaltyBanner'
import NewsCard from './NewsCard'
import BottomNav from './BottomNav'
import FloatingOrderButton from './FloatingOrderButton'

const UserHome = () => {
    const { user, role, signOut } = useAuth()
    const [stars, setStars] = useState(0)
    const [news, setNews] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            // Fetch User Stars
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('stars')
                    .eq('id', user.id)
                    .single()
                if (profile) setStars(profile.stars || 0)
            }

            // Fetch News
            const { data: newsData } = await supabase
                .from('news_events')
                .select('*')
                .order('created_at', { ascending: false })

            if (newsData) setNews(newsData)

            setLoading(false)
        }

        fetchData()
    }, [user])

    return (
        <div className="min-h-screen bg-[var(--color-background)] pb-24">

            {/* Top Header */}
            <header className="px-4 py-4 flex justify-between items-center relative z-10">
                <button className="p-2 text-white hover:bg-white/10 rounded-full transition-colors">
                    <Menu className="w-6 h-6" />
                </button>

                <div className="transform hover:scale-105 transition-transform cursor-pointer">
                    <img src="/logo-damaf.png" alt="DamafAPP" className="h-12 w-auto drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
                </div>

                {/* Admin Link or Sign Out */}
                <div className="flex gap-2 items-center">
                    {role === 'admin' && (
                        <Link to="/admin" className="text-white text-[10px] font-bold px-3 py-1.5 rounded-full bg-[var(--color-primary)] hover:bg-purple-700 transition-colors border border-transparent uppercase tracking-wider">
                            Admin
                        </Link>
                    )}
                    <button onClick={signOut} className="text-white text-[10px] font-bold px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/10 transition-colors uppercase tracking-wider">
                        Salir
                    </button>
                </div>
            </header>

            {/* Welcome Section */}
            <div className="px-4 pt-2 mb-6 text-center">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                    Bienvenido, <span className="text-[var(--color-secondary)]">{user?.email?.split('@')[0]}</span>!
                </h1>
                <p className="text-[var(--color-text-muted)] text-sm flex items-center justify-center gap-2">
                    ¿Con qué pensas bajonear hoy? <span className="text-xl">🍔</span>
                </p>
            </div>

            {/* Main Content */}
            <main className="px-4 max-w-lg mx-auto pt-2">
                <LoyaltyBanner stars={stars} />

                {/* News Feed */}
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-[var(--color-secondary)]" />
                    </div>
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
