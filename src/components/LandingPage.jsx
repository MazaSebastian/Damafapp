import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UtensilsCrossed, Loader2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import NewsCard from './NewsCard'
import BottomNav from './BottomNav'
import FloatingOrderButton from './FloatingOrderButton'
import { NewsSkeleton } from './skeletons/NewsSkeleton'
import StoreInfoHeader from './StoreInfoHeader'
import LockedLoyaltyBanner from './LockedLoyaltyBanner'

const LandingPage = () => {
    const [news, setNews] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchNews = async () => {
            const { data, error } = await supabase
                .from('news_events')
                .select('*')
                .order('created_at', { ascending: false })

            if (!error && data) {
                setNews(data)
            } else {
                // Fallback dummy data if empty for visualization
                if (!data || data.length === 0) {
                    setNews([
                        {
                            id: 1,
                            title: '¡Bienvenido a Burger Gourmet!',
                            description: 'Gana coronas con cada compra y canjéalas por increíbles premios.',
                            type: 'Promo',
                            action_text: 'Registrarme',
                            image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1000&auto=format&fit=crop'
                        },
                        {
                            id: 2,
                            title: 'Nuevo Combo Rockero',
                            description: 'Disfruta de una Stacker doble llena de barbacoa y aros de cebolla. ¡Solo por tiempo limitado!',
                            type: 'Nuevo',
                            action_text: 'Pedir Ahora',
                            image_url: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?q=80&w=1000&auto=format&fit=crop'
                        }
                    ])
                }
            }
            setLoading(false)
        }

        fetchNews()
    }, [])

    return (
        <div className="min-h-screen bg-[var(--color-background)] pb-20"> {/* pb-20 for bottom nav */}

            {/* Top Bar */}
            {/* Top Bar - Minimal */}
            <header className="fixed top-0 w-full z-50 px-4 py-4 flex justify-end items-center">
                <Link to="/register" className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-white/20 transition-colors uppercase tracking-wider shadow-lg">
                    Inscribirse
                </Link>
            </header>

            {/* Main Content with Store Info */}
            <div className="pt-16 pb-6">
                <StoreInfoHeader />

                {/* Locked Welcome Banner */}
                <div className="px-4">
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

