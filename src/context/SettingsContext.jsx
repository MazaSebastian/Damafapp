import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const SettingsContext = createContext()

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({})
    const [loading, setLoading] = useState(true)

    const fetchSettings = async () => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3500)

        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('*')
                .abortSignal(controller.signal)

            if (error) {
                if (error.name === 'AbortError') console.warn('Settings fetch timed out')
                else console.error('Error fetching settings:', error)
                return
            }

            // Convert array to object for easier access: { key: value }
            const settingsMap = (data || []).reduce((acc, item) => {
                acc[item.key] = item.value
                return acc
            }, {})

            setSettings(settingsMap)
        } catch (err) {
            console.error('Unexpected error fetching settings:', err)
        } finally {
            clearTimeout(timeoutId)
            setLoading(false)
        }
    }

    useEffect(() => {
        let mounted = true

        fetchSettings()

        return () => {
            mounted = false
        }
    }, [])

    // Helper to get a setting with a default value and optional type casting
    const getSetting = (key, defaultValue, type = 'string') => {
        const value = settings[key]
        if (value === undefined || value === null) return defaultValue

        if (type === 'number') {
            const num = Number(value)
            return isNaN(num) ? defaultValue : num
        }

        if (type === 'boolean') {
            return value === 'true'
        }

        return value
    }

    settings,
        getSetting,
        refreshSettings: fetchSettings,
            loading,
            isHydrated: !loading

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    )
}

export const useSettings = () => {
    const context = useContext(SettingsContext)
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider')
    }
    return context
}
