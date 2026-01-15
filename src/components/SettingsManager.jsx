import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { toast } from 'sonner'
import { Save, Loader2, Settings as SettingsIcon } from 'lucide-react'
import ScheduleConfig from './ScheduleConfig'

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
        'store_schedule_text': 'Texto Horarios (Footer)',
        'store_slogan': 'Slogan del Local',
        'store_phone': 'Teléfono / WhatsApp (549...)',
        'store_whatsapp_template': 'Plantilla de Mensaje',
        'store_schedule': 'Configuración de Horarios Automáticos',
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
            // Updated to exclude legacy settings if they still exist in DB
            if (category === 'tienda') return s.key.startsWith('store_') && s.key !== 'store_mode' && s.key !== 'store_status' && s.key !== 'store_phone' && s.key !== 'store_whatsapp_template'
            if (category === 'whatsapp') return s.key === 'store_phone' || s.key === 'store_whatsapp_template'
            if (category === 'delivery') return s.key.startsWith('delivery_')
            if (category === 'loyalty') return s.key.startsWith('loyalty_') || s.key.startsWith('stars_')
            return false
        })
    }

    const tabs = [
        { id: 'tienda', label: 'Tienda' },
        { id: 'whatsapp', label: 'WhatsApp' },
        { id: 'delivery', label: 'Delivery' },
        { id: 'loyalty', label: 'Fidelización' }
    ]



    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[var(--color-primary)]" /></div>

    const renderSettingInput = (setting) => {
        // Schedule Grid UI
        if (setting.key === 'store_schedule') {
            return (
                <div className="w-full mt-2">
                    <ScheduleConfig
                        value={setting.value}
                        onChange={(newValue) => handleChange(setting.key, newValue)}
                    />
                </div>
            )
        }

        // WhatsApp Template Special UI
        if (setting.key === 'store_whatsapp_template') {
            return (
                <div className="space-y-2">
                    <textarea
                        value={setting.value}
                        onChange={(e) => handleChange(setting.key, e.target.value)}
                        rows={10}
                        className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--color-primary)] resize-y font-mono text-sm leading-relaxed"
                    />
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-200">
                        <p className="font-bold mb-1">Variables disponibles:</p>
                        <p className="opacity-80">
                            Use estas etiquetas y el sistema las reemplazará automáticamente:<br />
                            <code className="bg-black/30 px-1 rounded">{`{{id}}`}</code> (ID Pedido),
                            <code className="bg-black/30 px-1 rounded ml-1">{`{{cliente}}`}</code> (Nombre),
                            <code className="bg-black/30 px-1 rounded ml-1">{`{{fecha}}`}</code>,
                            <code className="bg-black/30 px-1 rounded ml-1">{`{{entrega}}`}</code> (Dirección/Retiro),
                            <code className="bg-black/30 px-1 rounded ml-1">{`{{pago}}`}</code> (Método),
                            <code className="bg-black/30 px-1 rounded ml-1">{`{{items}}`}</code> (Lista productos),
                            <code className="bg-black/30 px-1 rounded ml-1">{`{{total}}`}</code>
                        </p>
                    </div>
                </div>
            )
        }

        // TextArea for long fields
        if (setting.key.includes('benefits') || setting.key.includes('schedule_text')) {
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
                            {setting.key === 'store_schedule' ? (
                                // Full Width Layout for Schedule
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-bold text-white transition-colors">{SETTING_LABELS[setting.key] || setting.key.replace(/_/g, ' ')}</h3>
                                            <p className="text-sm text-[var(--color-text-muted)] mt-1">
                                                {setting.description || 'Sin descripción'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleSave(setting.key, setting.value)}
                                            disabled={saving}
                                            className="group flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Guardar cambios"
                                        >
                                            {saving ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                            )}
                                            <span className="text-sm font-bold">{saving ? 'Guardando...' : 'Guardar'}</span>
                                        </button>
                                    </div>
                                    <div className="w-full">
                                        {renderSettingInput(setting)}
                                    </div>
                                </div>
                            ) : (
                                // Standard Side-by-Side Layout
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
                                            className="group flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-0.5"
                                            title="Guardar cambios"
                                        >
                                            {saving ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                            )}
                                            <span className="text-sm font-bold hidden md:inline">{saving ? 'Guardando...' : 'Guardar'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}
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
