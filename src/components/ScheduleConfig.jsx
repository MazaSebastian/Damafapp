import { useState, useEffect } from 'react'
import { Copy, Clock, CalendarCheck, CalendarX } from 'lucide-react'
import { toast } from 'sonner'

const DAYS_MAP = {
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
    6: 'Sábado',
    0: 'Domingo'
}

const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0] // Mon -> Sun

const ScheduleConfig = ({ value, onChange }) => {
    const [schedule, setSchedule] = useState({})

    useEffect(() => {
        try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value
            setSchedule(parsed || {})
        } catch (e) {
            setSchedule({})
        }
    }, [value])

    const updateDay = (dayIndex, updates) => {
        const newSchedule = {
            ...schedule,
            [dayIndex]: {
                ...(schedule[dayIndex] || { active: false, start: '19:00', end: '23:00' }),
                ...updates
            }
        }
        setSchedule(newSchedule)
        onChange(JSON.stringify(newSchedule))
    }

    const copyToAllParams = (sourceDayIndex) => {
        const source = schedule[sourceDayIndex] || { active: false, start: '19:00', end: '23:00' }
        const newSchedule = { ...schedule }

        ORDERED_DAYS.forEach(day => {
            if (day !== sourceDayIndex) {
                newSchedule[day] = { ...source }
            }
        })

        setSchedule(newSchedule)
        onChange(JSON.stringify(newSchedule))
        toast.success(`Horario de ${DAYS_MAP[sourceDayIndex]} copiado a toda la semana`)
    }

    return (
        <div className="bg-[var(--color-surface)] rounded-xl overflow-hidden border border-white/5">
            <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-2 text-white/80">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">Grilla Semanal</span>
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                    Define tus franjas de apertura automática
                </div>
            </div>

            <div className="divide-y divide-white/5">
                {ORDERED_DAYS.map(dayIndex => {
                    const dayData = schedule[dayIndex] || { active: false, start: '19:00', end: '23:00' }
                    const isActive = dayData.active

                    return (
                        <div
                            key={dayIndex}
                            className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 transition-colors ${isActive ? 'bg-transparent' : 'bg-black/20'}`}
                        >
                            {/* Left: Checkbox & Name */}
                            <div className="flex items-center gap-4 min-w-[140px]">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={isActive}
                                        onChange={(e) => updateDay(dayIndex, { active: e.target.checked })}
                                    />
                                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                                </label>
                                <div className="flex flex-col">
                                    <span className={`font-medium ${isActive ? 'text-white' : 'text-white/40'}`}>
                                        {DAYS_MAP[dayIndex]}
                                    </span>
                                    <span className={`text-[10px] uppercase tracking-wider ${isActive ? 'text-green-400' : 'text-red-400/50'}`}>
                                        {isActive ? 'Abierto' : 'Cerrado'}
                                    </span>
                                </div>
                            </div>

                            {/* Middle: Time Inputs */}
                            <div className={`flex items-center gap-3 transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
                                <div className="flex items-center bg-black/40 rounded-lg border border-white/10 px-3 py-1.5 focus-within:border-[var(--color-primary)] transition-colors">
                                    <span className="text-xs text-white/40 mr-2">DESDE</span>
                                    <input
                                        type="time"
                                        value={dayData.start}
                                        onChange={(e) => updateDay(dayIndex, { start: e.target.value })}
                                        className="bg-transparent text-white text-sm outline-none w-28 appearance-none [&::-webkit-calendar-picker-indicator]:invert"
                                    />
                                </div>
                                <span className="text-white/20">-</span>
                                <div className="flex items-center bg-black/40 rounded-lg border border-white/10 px-3 py-1.5 focus-within:border-[var(--color-primary)] transition-colors">
                                    <span className="text-xs text-white/40 mr-2">HASTA</span>
                                    <input
                                        type="time"
                                        value={dayData.end}
                                        onChange={(e) => updateDay(dayIndex, { end: e.target.value })}
                                        className="bg-transparent text-white text-sm outline-none w-28 appearance-none [&::-webkit-calendar-picker-indicator]:invert"
                                    />
                                </div>
                            </div>

                            {/* Right: Actions */}
                            <div className={`sm:ml-auto transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                                <button
                                    onClick={() => copyToAllParams(dayIndex)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-white/10 hover:border-white/30"
                                    title="Copiar este horario a todos los días"
                                >
                                    <Copy className="w-3 h-3" />
                                    <span className="hidden sm:inline">Copiar a todos</span>
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="bg-[var(--color-primary)]/10 p-4 text-xs text-white/90 flex items-start gap-3 border-t border-white/5">
                <CalendarCheck className="w-4 h-4 mt-0.5 shrink-0 text-[var(--color-primary)]" />
                <p>
                    El sistema abrirá y cerrará automáticamente el local según estos horarios.
                    <br />
                    <span className="text-white/60">Para cerrar un feriado específico, simplemente apaga el interruptor de ese día.</span>
                </p>
            </div>
        </div>
    )
}

export default ScheduleConfig
