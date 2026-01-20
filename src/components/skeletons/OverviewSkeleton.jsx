import { Skeleton } from "../ui/Skeleton"

const OverviewSkeleton = () => {
    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-[var(--color-surface)] p-6 rounded-2xl border border-white/5 h-32 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <Skeleton className="h-4 w-24 bg-white/5" />
                            <Skeleton className="h-6 w-6 bg-white/5 rounded-full" />
                        </div>
                        <Skeleton className="h-8 w-32 bg-white/10 mt-2" />
                    </div>
                ))}
            </div>

            {/* Shortcuts Section */}
            <div className="bg-[var(--color-surface)] rounded-2xl p-8 border border-white/5 h-64">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-full">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-4">
                            <Skeleton className="h-[150px] w-[150px] bg-white/5 rounded-xl" />
                            <Skeleton className="h-10 w-40 bg-white/10 rounded-full" />
                            <Skeleton className="h-4 w-32 bg-white/5" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default OverviewSkeleton
