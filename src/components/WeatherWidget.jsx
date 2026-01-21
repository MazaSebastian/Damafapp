import { useEffect, useState } from 'react'
import { Cloud, CloudRain, Sun, CloudLightning, CloudSnow, Droplets, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const WeatherWidget = () => {
    const [hourlyWeather, setHourlyWeather] = useState([])
    const [loading, setLoading] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date())

    // Vicente López Coordinates (approx location based on app context)
    const LAT = -34.52
    const LNG = -58.53

    useEffect(() => {
        // Clock Interval
        const timer = setInterval(() => setCurrentTime(new Date()), 60000)

        const fetchWeather = async () => {
            try {
                // Open-Meteo API: Free, no key required
                const response = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}&hourly=temperature_2m,precipitation_probability,weathercode&timezone=auto&forecast_days=1`
                )
                const data = await response.json()

                if (data.hourly) {
                    const now = new Date()
                    const currentHour = now.getHours()

                    // Map hourly data
                    const hours = data.hourly.time.map((time, index) => {
                        const date = new Date(time)
                        return {
                            time: date,
                            hour: date.getHours(),
                            temp: Math.round(data.hourly.temperature_2m[index]),
                            rainChance: data.hourly.precipitation_probability[index],
                            code: data.hourly.weathercode[index]
                        }
                    })
                        // Filter: Show from current hour onwards (rest of the day)
                        .filter(h => h.hour >= currentHour)

                    setHourlyWeather(hours)
                }
            } catch (error) {
                console.error("Error fetching weather:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchWeather()
        return () => clearInterval(timer)
    }, [])

    const getWeatherDescription = (code) => {
        // WMO Code interpretation
        if (code === 0) return 'Despejado'
        if (code === 1) return 'Mayormente Despejado'
        if (code === 2) return 'Parcialmente Nublado'
        if (code === 3) return 'Nublado'
        if (code === 45 || code === 48) return 'Niebla'
        if (code >= 51 && code <= 55) return 'Llovizna'
        if (code >= 56 && code <= 57) return 'Llovizna Helada'
        if (code === 61) return 'Lluvia Leve'
        if (code === 63) return 'Lluvia Moderada'
        if (code === 65) return 'Lluvia Fuerte'
        if (code >= 66 && code <= 67) return 'Lluvia Helada'
        if (code >= 71 && code <= 77) return 'Nieve'
        if (code >= 80 && code <= 82) return 'Chubascos'
        if (code >= 85 && code <= 86) return 'Chubascos de Nieve'
        if (code === 95) return 'Tormenta'
        if (code >= 96 && code <= 99) return 'Tormenta Eléctrica'
        return 'Desconocido'
    }

    const getWeatherIcon = (code) => {
        // Smaller icons for compact view
        if (code <= 1) return <Sun className="w-5 h-5 text-yellow-400" />
        if (code <= 3) return <Cloud className="w-5 h-5 text-gray-400" />
        if (code <= 48) return <Cloud className="w-5 h-5 text-gray-400" />
        if (code <= 67) return <CloudRain className="w-5 h-5 text-blue-400" />
        if (code <= 77) return <CloudSnow className="w-5 h-5 text-white" />
        if (code <= 82) return <CloudRain className="w-5 h-5 text-blue-500" />
        if (code <= 86) return <CloudSnow className="w-5 h-5 text-white" />
        if (code <= 99) return <CloudLightning className="w-5 h-5 text-purple-400" />
        return <Sun className="w-5 h-5 text-yellow-400" />
    }

    if (loading) return (
        <div className="h-32 bg-white/5 animate-pulse rounded-2xl w-full"></div>
    )

    // Capitalize first letter of string
    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

    const dateStr = capitalize(format(currentTime, "EEEE d 'de' MMMM, HH:mm'hs'", { locale: es }))

    return (
        <div className="bg-[var(--color-surface)] border border-white/5 rounded-2xl p-4 shadow-xl overflow-hidden mt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
                <div>
                    <h3 className="text-white font-bold text-base flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
                        {dateStr}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                            <Cloud className="w-3 h-3" /> Pronóstico VILO
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {hourlyWeather.map((h, i) => (
                    <div key={i} className="flex flex-col items-center min-w-[100px] bg-black/20 p-2.5 rounded-xl border border-white/5 hover:bg-white/5 transition-colors relative group">

                        {/* Probability Badge - Smaller & Compact */}
                        {h.rainChance > 0 && (
                            <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 text-[9px] text-blue-200 font-bold bg-blue-500/30 px-1 py-0.5 rounded-full border border-blue-500/20">
                                <Droplets className="w-2.5 h-2.5" />
                                {h.rainChance}%
                            </div>
                        )}

                        <span className="text-xs text-[var(--color-text-muted)] font-bold mb-2">
                            {format(h.time, 'HH:00')}
                        </span>

                        <div className="mb-2 transform group-hover:scale-110 transition-transform duration-300">
                            {getWeatherIcon(h.code)}
                        </div>

                        <div className="text-center mb-1">
                            <span className="text-lg font-black text-white">
                                {h.temp}°
                            </span>
                        </div>

                        <span className="text-[9px] uppercase font-bold text-center text-white/50 bg-white/5 px-1.5 py-0.5 rounded w-full truncate">
                            {getWeatherDescription(h.code)}
                        </span>
                    </div>
                ))}

                {hourlyWeather.length === 0 && (
                    <div className="text-center w-full py-4 text-white/50 text-sm">
                        No hay más datos por hoy.
                    </div>
                )}
            </div>
        </div>
    )
}

export default WeatherWidget
