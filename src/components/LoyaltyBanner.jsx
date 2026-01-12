import { Crown } from 'lucide-react'
import { Link } from 'react-router-dom'

const LoyaltyBanner = ({ stars = 0 }) => {
    // Logic for progress bar: assuming 100 stars is the goal
    const progress = Math.min((stars / 100) * 100, 100)

    return (
        <div className="bg-gradient-to-r from-[#502314] to-[#7c3a1f] rounded-2xl p-4 text-white shadow-xl relative overflow-hidden mb-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="bg-[var(--color-secondary)] text-xs font-bold px-2 py-0.5 rounded-sm inline-block mb-2">
                        Pide hoy por la APP y duplica Estrellas!
                    </p>
                    <div className="flex items-center gap-2">
                        <Crown className="w-8 h-8 fill-yellow-400 text-yellow-500" />
                        <span className="text-4xl font-bold">{stars}</span>
                    </div>
                    <p className="text-xs opacity-80 mt-1">Estrellas disponibles</p>
                </div>
                <Link to="/club-info" className="bg-white text-black text-xs font-bold px-4 py-1.5 rounded-full hover:bg-gray-100 transition-colors">
                    MI CLUB
                </Link>
            </div>

            {/* Progress Bar */}
            <div className="relative h-2 bg-black/30 rounded-full mb-6">
                <div
                    className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                ></div>

                {/* Markers */}
                {[0, 20, 40, 60, 80, 100].map((val) => (
                    <div key={val} className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white/20 rounded-full" style={{ left: `${val}%` }}></div>
                ))}
            </div>

            {/* Labels */}
            <div className="flex justify-between text-[10px] font-semibold opacity-70 px-0.5">
                <span>0</span>
                <span>20</span>
                <span>40</span>
                <span>60</span>
                <span>80</span>
                <span>100</span>
            </div>
        </div>
    )
}

export default LoyaltyBanner
