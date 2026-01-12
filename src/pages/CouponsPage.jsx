import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Ticket, Copy, Loader2, Info } from 'lucide-react'
import { supabase } from '../supabaseClient'

const CouponsPage = () => {
    const [coupons, setCoupons] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchCoupons()
    }, [])

    const fetchCoupons = async () => {
        try {
            const { data, error } = await supabase
                .from('coupons')
                .select('*, products(name)')
                .eq('is_active', true)
                .lt('usage_count', 1000) // Simple filter to hide exhausted coupons if we had a limit field check, but RLS/Query is better.
            // Actually usage_limit is a column perfectly usable.
            // Let's filter in JS for complexity or just show all active ones.

            if (error) throw error

            // Filter out those with expired limits locally or via advanced query if needed
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
        alert('Código ' + code + ' copiado al portapapeles!')
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
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-[var(--color-secondary)]" />
                    </div>
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
