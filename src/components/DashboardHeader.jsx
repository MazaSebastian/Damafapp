import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Clock } from 'lucide-react'

const DashboardHeader = () => {
    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000) // Update every second for accuracy
        return () => clearInterval(timer)
    }, [])

    // Capitalize first letter helper
    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

    // Format: "Martes 20 de Enero, 21:15hs"
    const dateStr = capitalize(format(currentTime, "EEEE d 'de' MMMM, HH:mm'hs'", { locale: es }))

    return (
        <div className="bg-[var(--color-surface)] border border-white/5 rounded-2xl p-6 shadow-lg flex items-center gap-4">
            <div className="p-3 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
                <Clock className="w-8 h-8" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                    {dateStr}
                </h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                    Panel de Administración
                </p>
            </div>
        </div>
    )
}

export default DashboardHeader
