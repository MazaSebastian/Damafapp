import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { ArrowLeft, Trash2, ShoppingBag, Plus } from 'lucide-react'

const CheckoutPage = () => {
    const { cart, removeFromCart, total, clearCart } = useCart()
    const navigate = useNavigate()

    const handleCheckout = () => {
        if (confirm('¿Confirmar pedido por $' + total.toFixed(2) + '?')) {
            alert('¡Pedido enviado a cocina!')
            clearCart()
            navigate('/')
        }
    }

    if (cart.length === 0) {
        return (
            <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-center p-4 text-center">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                    <ShoppingBag className="w-10 h-10 text-[var(--color-text-muted)]" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Tu pedido está vacío</h2>
                <p className="text-[var(--color-text-muted)] mb-8">¡Hora de buscar algo delicioso!</p>
                <Link to="/menu" className="bg-[var(--color-secondary)] text-white px-8 py-3 rounded-full font-bold hover:bg-orange-600 transition-colors">
                    Ir al Menú
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[var(--color-background)] pb-32">
            <header className="p-4 flex items-center sticky top-0 bg-[var(--color-background)]/90 backdrop-blur-md z-40 border-b border-white/5">
                <Link to="/menu" className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="ml-2 font-bold text-lg">Tu Pedido</h1>
            </header>

            <main className="p-4 max-w-lg mx-auto space-y-4">
                {cart.map((item, index) => (
                    <div key={item.id} className="bg-[var(--color-surface)] rounded-2xl p-4 border border-white/5 animated-slide-up" style={{ animationDelay: `${index * 100}ms` }}>

                        {/* Main Item */}
                        <div className="flex gap-4 mb-3">
                            <img src={item.main.image_url} className="w-16 h-16 rounded-lg object-cover bg-black/20" />
                            <div className="flex-1">
                                <h3 className="font-bold text-lg leading-tight">{item.main.name}</h3>
                                <p className="text-[var(--color-secondary)] font-bold">${item.main.price}</p>
                            </div>
                            <button onClick={() => removeFromCart(item.id)} className="self-start text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Details */}
                        <div className="pl-4 border-l-2 border-white/10 space-y-1 text-sm text-[var(--color-text-muted)]">
                            {item.modifiers?.map(mod => (
                                <div key={mod.id} className="flex justify-between">
                                    <span>• {mod.name}</span>
                                    {mod.price > 0 && <span>+${mod.price}</span>}
                                </div>
                            ))}
                            {item.side && (
                                <div className="flex justify-between text-white/80">
                                    <span>+ {item.side.name}</span>
                                    <span>+${item.side.price}</span>
                                </div>
                            )}
                            {item.drink && (
                                <div className="flex justify-between text-white/80">
                                    <span>+ {item.drink.name}</span>
                                    <span>+${item.drink.price}</span>
                                </div>
                            )}
                        </div>

                    </div>
                ))}

                <button
                    onClick={() => navigate('/menu')}
                    className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center gap-2 text-[var(--color-text-muted)] hover:border-[var(--color-secondary)] hover:text-[var(--color-secondary)] transition-all font-bold"
                >
                    <Plus className="w-5 h-5" />
                    Agregar otro pedido
                </button>
            </main>

            {/* Footer Summary */}
            <div className="fixed bottom-0 w-full bg-[var(--color-surface)] border-t border-white/5 p-6 z-50">
                <div className="max-w-lg mx-auto">
                    <div className="flex justify-between items-end mb-4">
                        <span className="text-[var(--color-text-muted)] font-medium">Total a Pagar</span>
                        <span className="text-3xl font-bold text-white">${total.toFixed(2)}</span>
                    </div>
                    <button onClick={handleCheckout} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-500 shadow-lg shadow-green-900/20 active:scale-95 transition-all">
                        Finalizar Compra
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CheckoutPage
