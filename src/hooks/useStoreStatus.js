import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export const useStoreStatus = () => {
    const [isOpen, setIsOpen] = useState(false) // Default closed for safety
    const [statusText, setStatusText] = useState('Cerrado')
    const [loading, setLoading] = useState(true)
    const [schedule, setSchedule] = useState({})

    useEffect(() => {
        // Initial Fetch
        fetchStatus()

        // Realtime Subscription
        const channel = supabase
            .channel('store_status_auto')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'app_settings',
                filter: "key=eq.store_schedule"
            }, () => {
                fetchStatus()
            })
            .subscribe()

        // Interval Check (Every 30 seconds)
        const interval = setInterval(() => {
            checkAutoSchedule(schedule)
        }, 30000)

        return () => {
            supabase.removeChannel(channel)
            clearInterval(interval)
        }
    }, [schedule])

    const fetchStatus = async () => {
        try {
            const { data } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'store_schedule')
                .single()

            if (data) {
                let parsedSchedule = {}
                try {
                    parsedSchedule = typeof data.value === 'string'
                        ? JSON.parse(data.value)
                        : data.value
                } catch (e) {
                    console.error("Invalid schedule JSON", e)
                }
                setSchedule(parsedSchedule)
                checkAutoSchedule(parsedSchedule)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const checkAutoSchedule = (currentSchedule) => {
        if (!currentSchedule || Object.keys(currentSchedule).length === 0) return

        const now = new Date()
        const day = now.getDay() // 0 = Sunday
        const hours = now.getHours().toString().padStart(2, '0')
        const minutes = now.getMinutes().toString().padStart(2, '0')
        const currentTime = `${hours}:${minutes}`

        const todayConfig = currentSchedule[day]

        if (todayConfig && todayConfig.active) {
            let endTime = todayConfig.end
            if (endTime === '00:00') endTime = '24:00'

            // Handle normal range (Start < End)
            if (todayConfig.start < endTime) {
                if (currentTime >= todayConfig.start && currentTime < endTime) {
                    setIsOpen(true)
                    setStatusText('Abierto')
                    return
                }
            }
            // Handle cross-midnight (Start > End) e.g. 23:00 - 02:00
            // Note: This only handles the "current day" part.
            // For full support, we'd need to check "Yesterday's" spillover.
            // But checking Start <= Current OR Current < End covers the crossover session?
            // Actually for a shift starting today: Current >= Start is enough to be open "tonight".
            // The "morning after" part would be handled by checking Yesterday's config.
            // For now, let's just stick to the requested fix for 00:00.
            else {
                // Spans midnight but NOT 00:00 ending.
                // If 18:00 to 02:00.
                // If it is 20:00. 20:00 >= 18:00 (True).
                if (currentTime >= todayConfig.start) {
                    setIsOpen(true)
                    setStatusText('Abierto')
                    return
                }
            }
        }

        // Also check "Yesterday" to see if we are in the early morning spillover
        // e.g. It is Monday 01:00 AM. Sunday was 18:00 - 02:00.
        // We need to check Sunday's config.
        const yesterday = day === 0 ? 6 : day - 1
        const yesterdayConfig = currentSchedule[yesterday]

        if (yesterdayConfig && yesterdayConfig.active) {
            let yEnd = yesterdayConfig.end
            if (yEnd === '00:00') yEnd = '24:00'

            // If yesterday crossed midnight (Start > End)
            if (yesterdayConfig.start > yEnd || (yEnd === '24:00' && yesterdayConfig.start > '00:00')) {
                // Actually if yEnd is 24:00 it didn't cross midnight in string terms but ends at midnight.
                // If 18:00 - 02:00. yEnd = '02:00'. Start '18:00'.
                // Current '01:00'.
                // Check if Current < yEnd
                if (yesterdayConfig.start > yEnd && currentTime < yEnd) {
                    setIsOpen(true)
                    setStatusText('Abierto')
                    return
                }
            }
        }

        setIsOpen(false)
        setStatusText('Cerrado')
    }

    return { isOpen, statusText, loading }
}
