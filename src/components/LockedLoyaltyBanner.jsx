import { Star, Trophy, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'

const LockedLoyaltyBanner = () => {
    return (
        <div className="relative mb-6 group cursor-pointer">
            {/* The "Card" - Blurred and Grayscale */}
            <div className="bg-gradient-to-r from-[#502314] to-[#7c3a1f] rounded-2xl p-5 text-white shadow-xl relative overflow-hidden border border-white/5 opacity-50 grayscale select-none filter blur-[1px]">
                {/* Level Badge Background */}
                <Trophy className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 rotate-12" />

                {/* Header */}
                <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                        <h2 className="text-lg font-bold text-white mb-1">¡Hola, Invitado! 👋</h2>
                        <div className="text-[10px] font-bold px-2 py-0.5 rounded-sm inline-block mb-2 uppercase tracking-wide bg-white/10 border border-white/10 text-gray-300">
                            Nivel ???
                        </div>
                        <div className="flex items-center gap-2">
                            <Star className="w-8 h-8 fill-gray-400 text-gray-500 shadow-lg" />
                            <span className="text-4xl font-bold drop-shadow-md">0</span>
                        </div>
                        <p className="text-xs opacity-80 mt-1">Estrellas en billetera</p>
                    </div>
                </div>

                {/* Progress Bar Container */}
                <div className="relative z-10">
                    <div className="flex justify-between text-xs mb-1.5 font-medium">
                        <span className="text-gray-400">Nivel Inicial</span>
                        <span className="text-white/60">Próximo: ???</span>
                    </div>

                    <div className="relative h-2.5 bg-black/40 rounded-full mb-2 overflow-hidden border border-white/5">
                        <div className="absolute top-0 left-0 h-full rounded-full bg-gray-500 w-[5%]"></div>
                    </div>

                    <div className="flex justify-between items-start">
                        <div className="text-[10px] text-white/50 max-w-[60%]">
                            <span className="uppercase font-bold text-white/70 block mb-0.5">Beneficios:</span>
                            ??? • ???
                        </div>
                    </div>
                </div>
            </div>

            {/* The Lock Overlay */}
            <Link
                to="/register"
                className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-6 bg-black/40 rounded-2xl backdrop-blur-[2px] transition-all hover:bg-black/50 hover:backdrop-blur-[1px] border-2 border-dashed border-white/20 hover:border-orange-500/50"
            >
                <div className="bg-[var(--color-surface)] p-3 rounded-full mb-3 shadow-2xl border border-white/10 animate-bounce group-hover:scale-110 transition-transform">
                    <Lock className="w-6 h-6 text-orange-500" />
                </div>

                <h3 className="font-bold text-lg text-white mb-1 drop-shadow-md">DAMAFAPP <span className="text-orange-500">CLUB</span></h3>
                <p className="text-sm text-gray-200 mb-3 max-w-[80%] font-medium drop-shadow-md">
                    Registrate para desbloquear tus estrellas, subir de nivel y canjear premios.
                </p>

                <span className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1">
                    Desbloquear Beneficios <span className="text-lg">➜</span>
                </span>
            </Link>
        </div>
    )
}

export default LockedLoyaltyBanner
