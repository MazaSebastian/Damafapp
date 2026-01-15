import { Link } from 'react-router-dom'
import { ChefHat, Monitor, Coffee, LayoutDashboard, Bike, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const AreaSelector = () => {
    const { signOut } = useAuth()

    return (
        <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-center p-6">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-12">
                    <img src="/logo-damaf.png" alt="Logo" className="h-20 mx-auto mb-4 object-contain" />
                    <h1 className="text-3xl font-black text-white uppercase tracking-wider">Selección de Área</h1>
                    <p className="text-[var(--color-text-muted)] mt-2">Bienvenido al sistema de gestión DamafAPP</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* KDS Cocina */}
                    <Link to="/kds" className="group relative bg-[var(--color-surface)] border border-white/5 rounded-3xl p-8 hover:border-[var(--color-secondary)]/50 hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <ChefHat className="w-10 h-10 text-orange-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Cocina (KDS)</h2>
                        <p className="text-sm text-[var(--color-text-muted)]">Visualización de comandas y gestión de tiempos de preparación.</p>
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-orange-500/50 scale-x-0 group-hover:scale-x-50 transition-transform duration-500 rounded-full mb-4 mx-auto w-1/2"></div>
                    </Link>

                    {/* Admin Panel */}
                    <Link to="/admin" className="group relative bg-[var(--color-surface)] border border-white/5 rounded-3xl p-8 hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <LayoutDashboard className="w-10 h-10 text-purple-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Administración</h2>
                        <p className="text-sm text-[var(--color-text-muted)]">Gestión total: Caja, Pedidos, Menú, Usuarios y Configuración.</p>
                    </Link>

                    {/* Próximamente: Barra / Delivery */}
                    <div className="relative bg-[var(--color-surface)]/50 border border-white/5 rounded-3xl p-8 flex flex-col items-center text-center opacity-70 cursor-not-allowed">
                        <div className="absolute top-4 right-4 bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest text-white/60">
                            Próximamente
                        </div>
                        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
                            <Coffee className="w-10 h-10 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white/50 mb-2">Barra / Café</h2>
                        <p className="text-sm text-[var(--color-text-muted)]">Gestión específica de bebidas.</p>
                    </div>

                    <div className="relative bg-[var(--color-surface)]/50 border border-white/5 rounded-3xl p-8 flex flex-col items-center text-center opacity-70 cursor-not-allowed">
                        <div className="absolute top-4 right-4 bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest text-white/60">
                            Próximamente
                        </div>
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                            <Bike className="w-10 h-10 text-green-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white/50 mb-2">Riders</h2>
                        <p className="text-sm text-[var(--color-text-muted)]">App para repartidores.</p>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <button
                        onClick={signOut}
                        className="flex items-center gap-2 mx-auto text-[var(--color-text-muted)] hover:text-white transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión Global
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AreaSelector
