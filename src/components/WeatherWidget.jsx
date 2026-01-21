import { useEffect, useState } from 'react'
import { Cloud, CloudRain, Sun, CloudLightning, CloudSnow, Droplets } from 'lucide-react'
import { format } from 'date-fns'

const WeatherWidget = () => {
    const [hourlyWeather, setHourlyWeather] = useState([])
    const [loading, setLoading] = useState(true)

    // Vicente López Coordinates (approx location based on app context)
    const LAT = -34.52
    const LNG = -58.53

    useEffect(() => {
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
    }, [])

    const getWeatherIcon = (code) => {
        // WMO Weather interpretation codes (https://open-meteo.com/en/docs)
        if (code <= 1) return <Sun className="w-6 h-6 text-yellow-400" />
        if (code <= 3) return <Cloud className="w-6 h-6 text-gray-400" />
        if (code <= 48) return <Cloud className="w-6 h-6 text-gray-400" />
        if (code <= 67) return <CloudRain className="w-6 h-6 text-blue-400" />
        if (code <= 77) return <CloudSnow className="w-6 h-6 text-white" />
        if (code <= 82) return <CloudRain className="w-6 h-6 text-blue-500" />
        if (code <= 86) return <CloudSnow className="w-6 h-6 text-white" />
        if (code <= 99) return <CloudLightning className="w-6 h-6 text-purple-400" />
        return <Sun className="w-6 h-6 text-yellow-400" />
    }

    if (loading) return (
        <div className="h-32 bg-white/5 animate-pulse rounded-2xl w-full"></div>
    )

    return (
        <div className="bg-[var(--color-surface)] border border-white/5 rounded-2xl p-6 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <Cloud className="text-blue-400" />
                        Clima de Hoy
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)]">Planificación de envíos</p>
                </div>
                <div className="text-xs font-bold bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20">
                    Vicente López
                </div>
            </div>

            <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide">
                {hourlyWeather.map((h, i) => (
                    <div key={i} className="flex flex-col items-center min-w-[70px] bg-black/20 p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
                        <span className="text-xs text-[var(--color-text-muted)] font-bold mb-2">
                            {format(h.time, 'HH:00')}
                        </span>

                        <div className="mb-2">
                            {getWeatherIcon(h.code)}
                        </div>

                        <span className="text-lg font-bold text-white mb-1">
                            {h.temp}°
                        </span>

                        {h.rainChance > 0 && (
                            <div className="flex items-center gap-0.5 text-[10px] text-blue-300 font-bold bg-blue-500/20 px-1.5 py-0.5 rounded-full">
                                <Droplets className="w-3 h-3" />
                                {h.rainChance}%
                            </div>
                        )}
                    </div>
                ))}

                {hourlyWeather.length === 0 && (
                    <div className="text-center w-full py-4 text-white/50 text-sm">
                        No hay datos disponibles para el resto del día.
                    </div>
                )}
            </div>
        </div>
    )
}

export default WeatherWidget
