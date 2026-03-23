import { Link } from 'react-router-dom'
import { useTenantNav } from '../hooks/useTenantNav'
import { useTenant } from '../context/TenantContext'
import { Home, AlertCircle } from 'lucide-react'

const NotFoundPage = () => {
    const tenantNav = useTenantNav()
    const { tenantLogo, tenantName } = useTenant()

    return (
        <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-center p-6 text-center">
            <img
                src={tenantLogo || '/logo-stacked.png'}
                alt={tenantName}
                className="w-20 h-20 object-contain mb-6 opacity-50"
            />

            <div className="bg-[var(--color-surface)]/80 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl max-w-sm w-full">
                <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
                    <AlertCircle className="w-8 h-8 text-orange-500" />
                </div>

                <h1 className="text-6xl font-black text-white mb-2">404</h1>
                <h2 className="text-lg font-bold text-white mb-2">Página no encontrada</h2>
                <p className="text-[var(--color-text-muted)] text-sm mb-6">
                    La página que buscás no existe o fue movida.
                </p>

                <Link
                    to={tenantNav.path('/')}
                    className="inline-flex items-center gap-2 bg-[var(--color-primary)] text-white font-bold py-3 px-6 rounded-xl hover:brightness-110 transition-all active:scale-95"
                >
                    <Home className="w-4 h-4" />
                    Volver al inicio
                </Link>
            </div>
        </div>
    )
}

export default NotFoundPage
