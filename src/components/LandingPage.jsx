import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, User, Home, QrCode, Ticket, UtensilsCrossed, Loader2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import NewsCard from './NewsCard'

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
            <header className="fixed top-0 w-full bg-[var(--color-background)]/90 backdrop-blur-md z-50 px-4 py-3 flex justify-between items-center border-b border-white/5">
                <button className="p-2 text-white">
                    <Menu className="w-6 h-6" />
                </button>

                <div className="bg-[var(--color-secondary)] p-1.5 rounded-lg">
                    <UtensilsCrossed className="text-white w-5 h-5" />
                </div>

                <Link to="/login" className="bg-white text-black text-xs font-bold px-4 py-2 rounded-full hover:bg-gray-200 transition-colors">
                    Inscribirse
                </Link>
            </header>

            {/* Main Feed */}
            <main className="pt-20 px-4 max-w-lg mx-auto">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-secondary)]" />
                    </div>
                ) : (
                    news.map(item => (
                        <NewsCard key={item.id} item={item} />
                    ))
                )}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 w-full bg-[var(--color-surface)] border-t border-white/5 px-6 py-3 flex justify-between items-center z-50">
                <NavItem icon={<Home className="w-6 h-6" />} label="Inicio" active />
                <NavItem icon={<UtensilsCrossed className="w-6 h-6" />} label="Pide aquí" />
                <NavItem icon={<QrCode className="w-6 h-6" />} label="Código" />
                <NavItem icon={<User className="w-6 h-6" />} label="Canjes" />
                <NavItem icon={<Ticket className="w-6 h-6" />} label="Cupones" />
            </nav>
        </div>
    )
}

const NavItem = ({ icon, label, active }) => (
    <div className={`flex flex-col items-center gap-1 ${active ? 'text-[var(--color-secondary)]' : 'text-[var(--color-text-muted)]'}`}>
        {icon}
        <span className="text-[10px] font-medium">{label}</span>
    </div>
)

export default LandingPage
