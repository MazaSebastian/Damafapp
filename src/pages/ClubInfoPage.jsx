import { Link } from 'react-router-dom'
import { ArrowLeft, Star, Coffee, Crown, Trophy } from 'lucide-react'
import { useLoyaltyLevels } from '../hooks/useLoyaltyLevels'
import { useAuth } from '../context/AuthContext'
import LoyaltyBanner from '../components/LoyaltyBanner'

const ClubInfoPage = () => {
    const { user, profile } = useAuth()
    const { levels, loading, moneyPerStar } = useLoyaltyLevels()
    const stars = profile?.stars || 0

    if (loading) return <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center text-white">Cargando...</div>

    return (
        <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-main)] pb-20">
            {/* Header */}
            <header className="sticky top-0 bg-[var(--color-background)]/90 backdrop-blur-md z-50 px-4 py-4 flex items-center gap-4 border-b border-white/5">
                <Link to="/" className="p-2 bg-[var(--color-surface)] rounded-full hover:bg-white/10 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-lg font-bold">Información del Club</h1>
            </header>

            <main className="px-4 py-6 max-w-lg mx-auto space-y-8">

                {/* Intro Section */}
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold italic">DAMAFAPP <span className="text-[var(--color-secondary)]">CLUB</span></h2>
                    <p className="text-[var(--color-text-muted)] text-sm">
                        Suma estrellas con cada compra y desbloquea beneficios exclusivos.
                    </p>
                </div>

                {/* Show User Progress if Logged In */}
                {user ? (
                    <LoyaltyBanner stars={stars} />
                ) : (
                    <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-white/5 text-center">
                        <p className="text-white font-bold mb-2">¡Únete hoy mismo!</p>
                        <p className="text-xs text-[var(--color-text-muted)] mb-4">Regístrate para empezar a sumar.</p>
                        <Link to="/login" className="inline-block bg-[var(--color-primary)] text-white text-sm font-bold px-6 py-2.5 rounded-full hover:bg-purple-700 transition-colors">
                            Iniciar Sesión / Registrarme
                        </Link>
                    </div>
                )}

                {/* How it works */}
                <div>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                        ¿Cómo funciona?
                    </h3>
                    <div className="bg-[var(--color-surface)] p-4 rounded-xl border border-white/5 flex items-center gap-4">
                        <div className="bg-[var(--color-background)] p-3 rounded-full">
                            <span className="text-2xl">💰</span>
                        </div>
                        <div>
                            <p className="font-bold text-white">1 Estrella por cada ${moneyPerStar}</p>
                            <p className="text-xs text-[var(--color-text-muted)]">Cada compra te acerca a tu próximo nivel.</p>
                        </div>
                    </div>
                </div>

                {/* Levels Grid */}
                <div>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-orange-500" />
                        Niveles y Beneficios
                    </h3>

                    <div className="space-y-4">
                        {/* Welcome Level */}
                        <LevelCard
                            icon={<Coffee className="w-6 h-6 text-orange-400" />}
                            title="Nivel Welcome"
                            subtitle="Empiezas aquí"
                            benefits={levels.WELCOME.benefits}
                            color="border-orange-500/30 bg-orange-500/5"
                        />

                        {/* Green Level */}
                        <LevelCard
                            icon={<Star className="w-6 h-6 text-green-400" />}
                            title="Nivel Green"
                            subtitle={`Al llegar a ${levels.GREEN.min} estrellas`}
                            benefits={levels.GREEN.benefits}
                            color="border-green-500/30 bg-green-500/5"
                        />

                        {/* Gold Level */}
                        <LevelCard
                            icon={<Crown className="w-6 h-6 text-yellow-400" />}
                            title="Nivel Gold"
                            subtitle={`Al llegar a ${levels.GOLD.min} estrellas`}
                            benefits={levels.GOLD.benefits}
                            color="border-yellow-500/30 bg-yellow-500/5"
                        />
                    </div>
                </div>

                <p className="text-center text-xs text-[var(--color-text-muted)] mt-8">
                    * Los beneficios pueden cambiar sin previo aviso.
                    <br />
                    Las estrellas caducan después de 12 meses de inactividad.
                </p>

            </main>
        </div>
    )
}

const LevelCard = ({ icon, title, subtitle, benefits, color }) => (
    <div className={`p-5 rounded-2xl border ${color} relative overflow-hidden`}>
        <div className="flex items-start gap-4 z-10 relative">
            <div className="bg-[var(--color-surface)] p-3 rounded-full border border-white/10">
                {icon}
            </div>
            <div>
                <h4 className="font-bold text-white text-lg">{title}</h4>
                <p className="text-xs text-[var(--color-text-muted)] mb-3">{subtitle}</p>

                <ul className="space-y-2">
                    {benefits.map((benefit, index) => (
                        <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                            <span className="text-[var(--color-secondary)] mt-1">•</span>
                            {benefit}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    </div>
)

export default ClubInfoPage
