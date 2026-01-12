import { Link } from 'react-router-dom'
import { ShoppingBag, Star, ChefHat, User, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import LandingPage from '../components/LandingPage'

const HomePage = () => {
    const { user, signOut } = useAuth()

    // If no user is logged in, show the Landing Page (Burger King Style)
    if (!user) {
        return <LandingPage />
    }

    // Authenticated View
    return (
        <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-main)] font-sans">
            {/* Header */}
            <header className="p-4 md:p-6 flex justify-between items-center bg-[var(--color-surface)] shadow-lg sticky top-0 z-50 border-b border-[var(--color-primary)]/30">
                <div className="flex items-center gap-2">
                    <div className="bg-[var(--color-secondary)] p-2 rounded-lg">
                        <ChefHat className="text-white w-6 h-6" />
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--color-text-main)]">
                        BURGER<span className="text-[var(--color-secondary)]">GOURMET</span>
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    {user ? (
                        <div className="flex items-center gap-4">
                            <Link to="/admin" className="hidden md:block text-sm hover:text-[var(--color-secondary)] transition-colors">
                                Dashboard
                            </Link>
                            <button onClick={signOut} className="text-sm border border-[var(--color-secondary)] px-3 py-1 rounded-full hover:bg-[var(--color-secondary)] transition-colors">
                                Salir
                            </button>
                        </div>
                    ) : (
                        <Link to="/login" className="flex items-center gap-2 text-sm font-medium hover:text-[var(--color-secondary)] transition-colors">
                            <LogIn className="w-4 h-4" />
                            <span>Login</span>
                        </Link>
                    )}
                    <div className="relative cursor-pointer">
                        <ShoppingBag className="w-6 h-6" />
                        <span className="absolute -top-1 -right-1 bg-[var(--color-secondary)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            0
                        </span>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative h-[50vh] flex flex-col justify-center items-center text-center p-6 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-primary)]/20 to-transparent z-0"></div>
                <div className="z-10 max-w-2xl">
                    <span className="text-[var(--color-secondary)] font-bold tracking-widest text-xs uppercase mb-2 block animate-fade-in">Premium Taste</span>
                    <h2 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight drop-shadow-md">
                        Taste the <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-secondary)] to-orange-500">Perfection</span>
                    </h2>
                    <p className="text-[var(--color-text-muted)] mb-8 text-lg">
                        Artisanal burgers crafted with passion and the finest ingredients.
                    </p>
                    <button className="bg-[var(--color-secondary)] hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-orange-500/20 transition-all transform hover:-translate-y-1">
                        Order Now
                    </button>
                </div>
            </section>

            {/* Popular Menu Preview */}
            <section className="p-6 md:p-12 max-w-6xl mx-auto">
                <div className="flex justify-between items-end mb-8">
                    <h3 className="text-2xl font-bold">Popular Choices</h3>
                    <span className="text-[var(--color-secondary)] text-sm font-semibold cursor-pointer">View Full Menu</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Card 1 */}
                    <div className="bg-[var(--color-surface)] rounded-2xl p-4 hover:bg-[var(--color-surface)]/80 transition-colors border border-white/5 group">
                        <div className="h-40 bg-[var(--color-primary)]/10 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden">
                            <div className="absolute top-2 right-2 bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                                <Star className="w-3 h-3 fill-current" /> 4.9
                            </div>
                            <span className="text-4xl">🍔</span>
                        </div>
                        <h4 className="text-lg font-bold mb-1 group-hover:text-[var(--color-secondary)] transition-colors">The Classic Supreme</h4>
                        <p className="text-[var(--color-text-muted)] text-sm mb-4 line-clamp-2">Double beef patty, aged cheddar, lettuce, tomato, house sauce on brioche.</p>
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-bold">$12.99</span>
                            <button className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white p-2 rounded-lg transition-colors">
                                <ShoppingBag className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-[var(--color-surface)] rounded-2xl p-4 hover:bg-[var(--color-surface)]/80 transition-colors border border-white/5 group">
                        <div className="h-40 bg-[var(--color-primary)]/10 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden">
                            <span className="text-4xl">🥓</span>
                        </div>
                        <h4 className="text-lg font-bold mb-1 group-hover:text-[var(--color-secondary)] transition-colors">Bacon Truffle Blast</h4>
                        <p className="text-[var(--color-text-muted)] text-sm mb-4 line-clamp-2">Smoked bacon, truffle aioli, caramelized onions, swiss cheese.</p>
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-bold">$15.50</span>
                            <button className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white p-2 rounded-lg transition-colors">
                                <ShoppingBag className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-[var(--color-surface)] rounded-2xl p-4 hover:bg-[var(--color-surface)]/80 transition-colors border border-white/5 group">
                        <div className="h-40 bg-[var(--color-primary)]/10 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden">
                            <span className="text-4xl">🥑</span>
                        </div>
                        <h4 className="text-lg font-bold mb-1 group-hover:text-[var(--color-secondary)] transition-colors">Cali Chicken Club</h4>
                        <p className="text-[var(--color-text-muted)] text-sm mb-4 line-clamp-2">Grilled chicken breast, avocado, bacon, lettuce, ranch dressing.</p>
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-bold">$13.50</span>
                            <button className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white p-2 rounded-lg transition-colors">
                                <ShoppingBag className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}

export default HomePage
