import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Ticket, Copy, Loader2, Info } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CouponSkeleton } from '../components/skeletons/CouponSkeleton'

const CouponsPage = () => {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [coupons, setCoupons] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                // If not logged in, show different view or redirect
                // Let's show a nice "Exclusive for Members" message
                setLoading(false)
            } else {
                fetchCoupons()
            }
        }
    }, [user, authLoading])

    const fetchCoupons = async () => {
        try {
            const { data, error } = await supabase
                .from('coupons')
                .select('*, products(name)')
                .eq('is_active', true)

            if (error) throw error

            const validCoupons = data.filter(c => !c.usage_limit || c.usage_count < c.usage_limit)
            setCoupons(validCoupons)
        } catch (error) {
            console.error('Error fetching coupons:', error)
        } finally {
            setLoading(false)
        }
    }

    const copyCode = (code) => {
        navigator.clipboard.writeText(code)
        toast.success(`Código ${code} copiado!`)
    }

    if (authLoading) return <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>

    if (!user) {
        return (
            <div className="min-h-screen bg-[var(--color-background)] pb-24 flex flex-col">
                <header className="p-4 flex items-center sticky top-0 bg-[var(--color-background)]/90 backdrop-blur-md z-40 border-b border-white/5">
                    <Link to="/" className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="ml-2 font-bold text-lg">Cupones</h1>
                </header>

                <main className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                    <div className="w-24 h-24 bg-[var(--color-surface)] rounded-full flex items-center justify-center border border-white/10">
                        <Ticket className="w-10 h-10 text-[var(--color-primary)]" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Beneficio Exclusivo</h2>
                        <p className="text-[var(--color-text-muted)]">
                            Los cupones de descuento son solo para miembros del club.
                            <br />Regístrate gratis para acceder.
                        </p>
                    </div>
                    <Link
                        to="/login"
                        className="w-full max-w-xs bg-[var(--color-primary)] text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-900/20 hover:bg-purple-700 transition-all active:scale-95"
                    >
                        Iniciar Sesión / Registrarme
                    </Link>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[var(--color-background)] pb-24">
            {/* Header */}
            <header className="p-4 flex items-center sticky top-0 bg-[var(--color-background)]/90 backdrop-blur-md z-40 border-b border-white/5">
                <Link to="/" className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="ml-2 font-bold text-lg">Cupones Disponibles</h1>
            </header>

            <main className="p-4 max-w-lg mx-auto space-y-4">
                {loading ? (
                    <CouponSkeleton />
                ) : coupons.length === 0 ? (
                    <div className="text-center py-10 text-[var(--color-text-muted)]">
                        <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No hay cupones disponibles por el momento.</p>
                    </div>
                ) : (
                    coupons.map(coupon => (
                        <div key={coupon.id} className="bg-[var(--color-surface)] rounded-2xl p-4 border border-white/5 relative overflow-hidden group">
                            {/* Decorative Circle */}
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-[var(--color-secondary)]/10 rounded-full blur-xl group-hover:bg-[var(--color-secondary)]/20 transition-all"></div>

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="bg-[var(--color-secondary)]/20 text-[var(--color-secondary)] text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                                        {coupon.discount_type === 'percentage' ? `${coupon.value}% OFF` :
                                            coupon.discount_type === 'fixed' ? `$${coupon.value} OFF` :
                                                'Producto Gratis'}
                                    </div>
                                    <Ticket className="w-5 h-5 text-white/20" />
                                </div>

                                <h3 className="text-2xl font-black text-white mb-1 tracking-tight">{coupon.code}</h3>
                                <p className="text-[var(--color-text-muted)] text-sm mb-4">
                                    {coupon.discount_type === 'product' && coupon.products
                                        ? `Canjeá este cupón por un ${coupon.products.name} gratis.`
                                        : 'Descuento válido en tu próxima compra.'}
                                </p>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => copyCode(coupon.code)}
                                        className="flex-1 bg-white text-black py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                                    >
                                        <Copy className="w-4 h-4" />
                                        Copiar Código
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </main>
        </div>
    )
}

export default CouponsPage
