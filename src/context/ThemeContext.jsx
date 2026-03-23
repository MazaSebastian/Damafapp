import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useTenant } from './TenantContext'

const ThemeContext = createContext()

export const useTheme = () => useContext(ThemeContext)

export const ThemeProvider = ({ children }) => {
    const { tenantId, tenantTheme } = useTenant()
    const [themeSettings, setThemeSettings] = useState({})
    const [loading, setLoading] = useState(true)

    const fetchThemeSettings = async () => {
        if (!tenantId) return

        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('*')
                .eq('tenant_id', tenantId)
                .like('key', 'theme_%')

            if (error) throw error

            if (data) {
                const settings = {}
                data.forEach(item => {
                    settings[item.key] = item.value
                })
                setThemeSettings(settings)
                applyTheme(settings)
            }
        } catch (error) {
            console.error('Error fetching theme settings:', error)
        } finally {
            setLoading(false)
        }
    }

    const applyTheme = (settings) => {
        const root = document.documentElement

        // Step 1: Apply fallback from tenant.theme JSONB (used if no app_settings exist yet)
        if (tenantTheme) {
            if (tenantTheme.primary) root.style.setProperty('--color-primary', tenantTheme.primary)
            if (tenantTheme.secondary) root.style.setProperty('--color-secondary', tenantTheme.secondary)
            if (tenantTheme.background) root.style.setProperty('--color-background', tenantTheme.background)
            if (tenantTheme.surface) root.style.setProperty('--color-surface', tenantTheme.surface)
        }

        // Step 2: Apply app_settings OVERRIDES (single source of truth for admin-configured themes)
        if (settings.theme_color_primary) root.style.setProperty('--color-primary', settings.theme_color_primary)
        if (settings.theme_color_secondary) root.style.setProperty('--color-secondary', settings.theme_color_secondary)
        if (settings.theme_color_background) root.style.setProperty('--color-background', settings.theme_color_background)
        if (settings.theme_color_surface) root.style.setProperty('--color-surface', settings.theme_color_surface)
        if (settings.theme_color_text_main) root.style.setProperty('--color-text-main', settings.theme_color_text_main)
        if (settings.theme_color_text_muted) root.style.setProperty('--color-text-muted', settings.theme_color_text_muted)
    }

    const updateThemeSetting = async (key, value) => {
        const newSettings = { ...themeSettings, [key]: value }
        setThemeSettings(newSettings)
        applyTheme(newSettings)
    }

    const refreshTheme = () => fetchThemeSettings()

    useEffect(() => {
        if (tenantId) {
            fetchThemeSettings()
        }
    }, [tenantId])

    return (
        <ThemeContext.Provider value={{ themeSettings, loading, refreshTheme, updateThemeSetting }}>
            {children}
        </ThemeContext.Provider>
    )
}
