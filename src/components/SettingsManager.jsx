import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { toast } from 'sonner'
import { Save, Loader2, Settings as SettingsIcon } from 'lucide-react'

const SettingsManager = () => {
    const [settings, setSettings] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState('tienda')

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('app_settings')
            .select('*')
            .order('key')

        if (error) {
            console.error('Error fetching settings:', error)
            toast.error('Error al cargar configuración')
        } else {
            setSettings(data || [])
        }
        setLoading(false)
    }

    const handleChange = (key, newValue) => {
        setSettings(prev => prev.map(item =>
            item.key === key ? { ...item, value: newValue } : item
        ))
    }

    const handleSave = async (key, value) => {
        setSaving(true)
        const { error } = await supabase
            .from('app_settings')
            .update({ value, updated_at: new Date() })
            .eq('key', key)

        if (error) {
            console.error('Error saving setting:', error)
            toast.error('Error al guardar')
        } else {
            toast.success('Configuración actualizada')
        }
        setSaving(false)
    }

    const SETTING_LABELS = {
        'delivery_free_range_km': 'Radio de Envío Gratis (KM)',
        'delivery_price_per_km': 'Precio por KM Adicional',
        'stars_exchange_rate': 'Tasa de Canje de Estrellas (Legacy)',
        'store_address': 'Dirección del Local',
        'store_instagram': 'Instagram',
        'store_lat': 'Latitud del Local',
        'store_lng': 'Longitud del Local',
        'store_schedule_text': 'Horarios de Atención',
        'store_slogan': 'Slogan del Local',
        'store_status': 'Estado del Local (Abierto/Cerrado)',
        'loyalty_earning_divisor': 'Divisor de Puntos (Monto para 1 estrella)',
        'loyalty_level_green': 'Nivel Green (Estrellas necesarias)',
        'loyalty_level_gold': 'Nivel Gold (Estrellas necesarias)',
        'loyalty_benefits_welcome': 'Beneficios Nivel Welcome (separados por coma)',
        'loyalty_benefits_green': 'Beneficios Nivel Green (separados por coma)',
        'loyalty_benefits_gold': 'Beneficios Nivel Gold (separados por coma)'
    }

    // Helper to group settings
    const getSettingsByCategory = (category) => {
        return settings.filter(s => {
            if (category === 'tienda') return s.key.startsWith('store_')
            if (category === 'delivery') return s.key.startsWith('delivery_')
            if (category === 'loyalty') return s.key.startsWith('loyalty_') || s.key.startsWith('stars_')
            return false
        })
    }

    const tabs = [
        { id: 'tienda', label: 'Tienda' },
        { id: 'delivery', label: 'Delivery' },
        { id: 'loyalty', label: 'Fidelización' }
    ]

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[var(--color-primary)]" /></div>

    const renderSettingInput = (setting) => {
        if (setting.key === 'store_status') {
            return (
                <select
                    value={setting.value}
                    onChange={(e) => handleChange(setting.key, e.target.value)}
                    className={`w-full border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--color-primary)] font-bold appearance-none cursor-pointer ${setting.value === 'open'
                        ? 'bg-green-500/10 text-green-400 border-green-500/30'
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}
                >
                    <option value="open" className="bg-[var(--color-surface)] text-green-400">🟢 Abierto</option>
                    <option value="closed" className="bg-[var(--color-surface)] text-red-400">🔴 Cerrado</option>
                </select>
            )
        }

        // TextArea for long fields (like benefits)
        if (setting.key.includes('benefits') || setting.key.includes('schedule')) {
            return (
                <textarea
                    value={setting.value}
                    onChange={(e) => handleChange(setting.key, e.target.value)}
                    rows={3}
                    className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--color-primary)] resize-none"
                />
            )
        }

        return (
            <input
                type="text"
                value={setting.value}
                onChange={(e) => handleChange(setting.key, e.target.value)}
                className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--color-primary)]"
            />
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-[var(--color-surface)] rounded-xl border border-white/10">
                    <SettingsIcon className="w-6 h-6 text-[var(--color-primary)]" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Configuración del Sistema</h2>
                    <p className="text-sm text-[var(--color-text-muted)]">Ajusta los parámetros globales de la aplicación</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10 mb-6">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === tab.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-white'}`}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--color-primary)] rounded-t-full" />
                        )}
                    </button>
                ))}
            </div>

            <div className="grid gap-6">
                {getSettingsByCategory(activeTab).length > 0 ? (
                    getSettingsByCategory(activeTab).map((setting) => (
                        <div key={setting.key} className="bg-[var(--color-surface)] p-6 rounded-2xl border border-white/5">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-white transition-colors">{SETTING_LABELS[setting.key] || setting.key.replace(/_/g, ' ')}</h3>
                                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                                        {setting.description || 'Sin descripción'}
                                    </p>
                                </div>
                                <div className="flex items-start gap-3 w-full md:w-auto">
                                    <div className="relative w-full md:w-80">
                                        {renderSettingInput(setting)}
                                    </div>
                                    <button
                                        onClick={() => handleSave(setting.key, setting.value)}
                                        disabled={saving}
                                        className="p-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 mt-1"
                                        title="Guardar"
                                    >
                                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-[var(--color-surface)] p-8 rounded-2xl border border-white/5 text-center">
                        <p className="text-[var(--color-text-muted)]">No hay configuraciones disponibles en esta categoría.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default SettingsManager
