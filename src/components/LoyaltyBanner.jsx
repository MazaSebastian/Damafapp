import { Star, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLoyaltyLevels } from '../hooks/useLoyaltyLevels'
import { useAuth } from '../context/AuthContext'

const LoyaltyBanner = ({ stars = 0 }) => {
    const { profile } = useAuth()
    const { currentLevel, nextLevel, progress, starsToNext, loading } = useLoyaltyLevels()

    // While settings load, we might flicker or show default. 
    // Ideally we could show a skeleton, but for now we render gracefully.
    // If name is missing, just show "Hola!" without name to avoid "Hola, Usuario"
    const firstName = profile?.full_name?.split(' ')[0] || ''

    if (loading) return null

    return (
        <div className="bg-gradient-to-r from-[#502314] to-[#7c3a1f] rounded-2xl p-5 text-white shadow-xl relative overflow-hidden mb-6 border border-white/5">

            {/* Level Badge Background */}
            <Trophy className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 rotate-12" />

            {/* Header */}
            <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                    <h2 className="text-lg font-bold text-white mb-1">
                        {firstName ? `¡Hola, ${firstName}! 👋` : '¡Hola! 👋'}
                    </h2>
                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded-sm inline-block mb-2 uppercase tracking-wide bg-white/10 border border-white/10 ${currentLevel.color.replace('text-', 'text-')}`}>
                        Nivel {currentLevel.name}
                    </div>
                    <div className="flex items-center gap-2">
                        <Star className="w-8 h-8 fill-yellow-400 text-yellow-500 shadow-lg" />
                        <span className="text-4xl font-bold drop-shadow-md">{stars}</span>
                    </div>
                    <p className="text-xs opacity-80 mt-1">Estrellas en billetera</p>
                </div>
                <Link to="/club-info" className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-white/20 transition-colors">
                    MI CLUB ➜
                </Link>
            </div>

            {/* Progress Bar Container */}
            <div className="relative z-10">
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                    <span className={currentLevel.color}>{currentLevel.name}</span>
                    {nextLevel ? (
                        <span className="text-white/60">Próximo: {nextLevel.name}</span>
                    ) : (
                        <span className="text-yellow-400">¡Nivel Gold! 🌟</span>
                    )}
                </div>

                <div className="relative h-2.5 bg-black/40 rounded-full mb-2 overflow-hidden border border-white/5">
                    <div
                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${currentLevel.bg}`}
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                <div className="flex justify-between items-start">
                    {/* Benefits / Rewards Status */}
                    <div className="text-[10px] text-white/50 max-w-[60%]">
                        <span className="uppercase font-bold text-white/70 block mb-0.5">Beneficios:</span>
                        {currentLevel.benefits?.join(' • ')}
                    </div>

                    <div className="text-right">
                        {nextLevel ? (
                            <p className="text-[10px] opacity-70">
                                Faltan <span className="font-bold text-white">{starsToNext}</span> para subir
                            </p>
                        ) : (
                            <p className="text-[10px] opacity-70">
                                <span className="font-bold text-yellow-400">{starsToNext} stars</span> para tu próxima bebida
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LoyaltyBanner


