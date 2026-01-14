import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UtensilsCrossed, Loader2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import NewsCard from './NewsCard'
import BottomNav from './BottomNav'
import FloatingOrderButton from './FloatingOrderButton'
import { NewsSkeleton } from './skeletons/NewsSkeleton'
import StoreInfoHeader from './StoreInfoHeader'

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

                {/* Welcome Banner */}
                <div className="px-4 mb-2">
                    <div className="bg-[#502314] rounded-xl p-4 flex justify-between items-center shadow-lg relative overflow-hidden ring-1 ring-white/10">
                        {/* Decor */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-600"></div>

                        <div className="flex-1 pr-4">
                            <h2 className="text-white font-bold text-lg italic leading-tight mb-1">DAMAFAPP <span className="text-orange-500">CLUB</span></h2>
                            <p className="text-white/80 text-xs leading-relaxed">
                                ¡Bienvenido! Podés ganar puntos con cada compra y canjearlos por productos en la tienda online!
                            </p>
                        </div>
                        <Link to="/club-info" className="bg-[#3e1c0f] border border-[#7c4b38] text-white text-xs font-bold px-3 py-1.5 rounded-full hover:bg-[#5a2a18] transition-colors whitespace-nowrap">
                            Detalles
                        </Link>
                    </div>
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

