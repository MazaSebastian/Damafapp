import { ArrowRight } from 'lucide-react'

const NewsCard = ({ item }) => {
    return (
        <div className="bg-[var(--color-surface)] rounded-2xl overflow-hidden shadow-lg border border-white/5 mb-6 group">
            {/* Image Container */}
            <div className="relative h-48 md:h-64 overflow-hidden">
                {item.image_url ? (
                    <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full bg-[var(--color-primary)]/20 flex items-center justify-center">
                        <span className="text-4xl">🍔</span>
                    </div>
                )}
                <div className="absolute top-4 left-4">
                    <span className="bg-[var(--color-secondary)] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                        {item.type || 'Novedad'}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                <h3 className="text-xl font-bold mb-2 text-white leading-tight">{item.title}</h3>
                <p className="text-[var(--color-text-muted)] text-sm mb-4 line-clamp-3">
                    {item.description}
                </p>

                <button className="w-full bg-[var(--color-background)] hover:bg-[var(--color-primary)] border border-[var(--color-primary)]/50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 group-hover:border-[var(--color-secondary)] group-hover:text-[var(--color-secondary)] group-hover:bg-[var(--color-surface)]">
                    {item.action_text || 'See Details'}
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}

export default NewsCard
