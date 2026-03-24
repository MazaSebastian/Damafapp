import { useState, useEffect } from 'react'
import { useTenant } from '../context/TenantContext'
import { useSettings } from '../context/SettingsContext'
import { supabase } from '../supabaseClient'
import { toast } from 'sonner'
import {
    FileText, CreditCard, MapPin, MessageCircle, Bell,
    CheckCircle2, AlertCircle, XCircle, ChevronRight,
    Eye, EyeOff, Save, Loader2, X, Smartphone, Settings2,
    Wifi, WifiOff
} from 'lucide-react'

// ─────────────────────────────────────────────
// Sub-component: Integration Status Badge
// ─────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const configs = {
        active: { icon: CheckCircle2, label: 'Activo', cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
        pending: { icon: AlertCircle, label: 'Sin configurar', cls: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
        error: { icon: XCircle, label: 'Error', cls: 'text-red-400 bg-red-400/10 border-red-400/30' },
    }
    const { icon: Icon, label, cls } = configs[status] || configs.pending
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
            <Icon size={12} />
            {label}
        </span>
    )
}

// ─────────────────────────────────────────────
// Sub-component: Integration Card
// ─────────────────────────────────────────────
const IntegrationCard = ({ icon: Icon, iconBg, title, description, status, detail, onConfigure }) => (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:bg-white/8 transition-all group">
        <div className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center shrink-0 shadow-lg`}>
            <Icon size={26} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h3 className="font-bold text-white text-sm">{title}</h3>
                <StatusBadge status={status} />
            </div>
            <p className="text-white/50 text-xs leading-relaxed">{description}</p>
            {detail && <p className="text-white/30 text-xs mt-1 font-mono truncate">{detail}</p>}
        </div>
        <button
            onClick={onConfigure}
            className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl transition-all border border-white/10"
        >
            <Settings2 size={13} />
            <span className="hidden sm:inline">Configurar</span>
            <ChevronRight size={13} />
        </button>
    </div>
)

// ─────────────────────────────────────────────
// Sub-component: Secure text input with show/hide
// ─────────────────────────────────────────────
const SecretInput = ({ label, value, onChange, placeholder, hint }) => {
    const [show, setShow] = useState(false)
    return (
        <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5">{label}</label>
            <div className="relative">
                <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 font-mono"
                />
                <button
                    type="button"
                    onClick={() => setShow(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
            </div>
            {hint && <p className="text-white/30 text-xs mt-1.5 leading-relaxed">{hint}</p>}
        </div>
    )
}

// ─────────────────────────────────────────────
// Sub-component: Modal base
// ─────────────────────────────────────────────
const Modal = ({ title, icon: Icon, iconBg, onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={onClose}>
        <div
            className="bg-gray-900/95 border border-white/15 rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
                        <Icon size={18} className="text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-white">{title}</h2>
                </div>
                <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors p-1">
                    <X size={20} />
                </button>
            </div>
            {children}
        </div>
    </div>
)

// ═══════════════════════════════════════════════
// MODAL: MercadoPago
// ═══════════════════════════════════════════════
const ModalMercadoPago = ({ onClose, tenantId, onSaved }) => {
    const [accessToken, setAccessToken] = useState('')
    const [publicKey, setPublicKey] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        supabase.from('mp_credentials')
            .select('public_key')
            .eq('tenant_id', tenantId)
            .maybeSingle()
            .then(({ data }) => {
                if (data) {
                    setPublicKey(data.public_key)
                    setAccessToken('••••••••••••••••••')
                }
            })
    }, [tenantId])

    const handleSave = async () => {
        if (!accessToken || !publicKey || accessToken === '••••••••••••••••••') {
            toast.error('Completá todos los campos')
            return
        }
        setSaving(true)
        const { error } = await supabase.from('mp_credentials').upsert({
            tenant_id: tenantId,
            access_token: accessToken,
            public_key: publicKey,
            is_active: true,
        }, { onConflict: 'tenant_id' })
        setSaving(false)
        if (error) { toast.error('Error al guardar: ' + error.message); return }
        toast.success('Credenciales de MercadoPago guardadas')
        onSaved()
        onClose()
    }

    return (
        <Modal title="MercadoPago" icon={CreditCard} iconBg="bg-sky-500/20" onClose={onClose}>
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 mb-5">
                <p className="text-sky-300 text-xs font-semibold mb-1">¿Dónde encontrar estas credenciales?</p>
                <p className="text-sky-200/70 text-xs">Ingresá a <a href="https://www.mercadopago.com.ar/developers" target="_blank" rel="noreferrer" className="underline">mercadopago.com.ar/developers</a> → Tu aplicación → <b>Credenciales de producción</b>.</p>
            </div>
            <div className="space-y-4">
                <SecretInput
                    label="Access Token de Producción *"
                    value={accessToken}
                    onChange={setAccessToken}
                    placeholder="APP_USR-0000000000000000-000000-..."
                    hint="⚠️ Nunca compartir. Solo se usa en el servidor para crear cobros."
                />
                <div>
                    <label className="block text-xs font-semibold text-white/60 mb-1.5">Public Key de Producción *</label>
                    <input
                        type="text"
                        value={publicKey}
                        onChange={e => setPublicKey(e.target.value)}
                        placeholder="APP_USR-xxxxxxxx-xxxx-..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 font-mono"
                    />
                    <p className="text-white/30 text-xs mt-1.5">Esta clave es pública y se usa en el checkout del cliente.</p>
                </div>
            </div>
            <button
                onClick={handleSave}
                disabled={saving}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all"
            >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Guardando...' : 'Guardar credenciales'}
            </button>
        </Modal>
    )
}

// ═══════════════════════════════════════════════
// MODAL: ARCA (Facturación Electrónica)
// ═══════════════════════════════════════════════
const ModalARCA = ({ onClose, tenantId, onSaved }) => {
    const [form, setForm] = useState({ cuit: '', sales_point: '', cert_crt: '', private_key: '', environment: 'production' })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        supabase.from('afip_credentials')
            .select('cuit, sales_point, environment')
            .eq('tenant_id', tenantId)
            .maybeSingle()
            .then(({ data }) => {
                if (data) setForm(f => ({ ...f, cuit: data.cuit, sales_point: data.sales_point, environment: data.environment }))
            })
    }, [tenantId])

    const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }))

    const handleSave = async () => {
        if (!form.cuit || !form.sales_point || !form.cert_crt || !form.private_key) {
            toast.error('Completá todos los campos obligatorios')
            return
        }
        setSaving(true)
        const { error } = await supabase.from('afip_credentials').upsert({
            tenant_id: tenantId,
            cuit: form.cuit,
            sales_point: parseInt(form.sales_point),
            cert_crt: form.cert_crt,
            private_key: form.private_key,
            environment: form.environment,
            is_active: true,
        }, { onConflict: 'tenant_id' })
        setSaving(false)
        if (error) { toast.error('Error: ' + error.message); return }
        toast.success('Credenciales ARCA guardadas')
        onSaved()
        onClose()
    }

    return (
        <Modal title="Facturación ARCA" icon={FileText} iconBg="bg-emerald-500/20" onClose={onClose}>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-5 space-y-2">
                <p className="text-amber-300 text-xs font-semibold">Trámites previos necesarios (en portal AFIP):</p>
                <ol className="text-amber-200/70 text-xs space-y-1 list-decimal list-inside leading-relaxed">
                    <li>Adherirse a los servicios <b>wsaa</b> y <b>wsfe</b></li>
                    <li>Generar certificado digital (la plataforma puede asistirte)</li>
                    <li>Habilitar un Punto de Venta de tipo <b>Web Services</b></li>
                </ol>
            </div>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-white/60 mb-1.5">CUIT *</label>
                        <input type="text" value={form.cuit} onChange={e => set('cuit')(e.target.value)}
                            placeholder="20-12345678-9"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 font-mono"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-white/60 mb-1.5">Punto de Venta *</label>
                        <input type="number" value={form.sales_point} onChange={e => set('sales_point')(e.target.value)}
                            placeholder="1"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-white/60 mb-1.5">Ambiente</label>
                    <select value={form.environment} onChange={e => set('environment')(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                    >
                        <option value="production">Producción</option>
                        <option value="testing">Testing (Homologación)</option>
                    </select>
                </div>
                <SecretInput label="Certificado Digital (.crt) *" value={form.cert_crt} onChange={set('cert_crt')}
                    placeholder="-----BEGIN CERTIFICATE-----&#10;..." hint="Pegá el contenido completo del archivo .crt descargado de AFIP." />
                <SecretInput label="Clave Privada *" value={form.private_key} onChange={set('private_key')}
                    placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;..." hint="⚠️ Nunca compartir. Se cifra antes de almacenar." />
            </div>
            <button onClick={handleSave} disabled={saving}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Guardando...' : 'Guardar configuración ARCA'}
            </button>
        </Modal>
    )
}

// ═══════════════════════════════════════════════
// MODAL: Google Maps
// ═══════════════════════════════════════════════
const ModalGoogleMaps = ({ onClose, tenantId, settings, refreshSettings, onSaved }) => {
    const [form, setForm] = useState({
        gmaps_api_key: settings.gmaps_api_key || '',
        store_address: settings.store_address || '',
        store_lat: settings.store_lat || '',
        store_lng: settings.store_lng || '',
    })
    const [saving, setSaving] = useState(false)
    const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }))

    const handleSave = async () => {
        if (!form.gmaps_api_key) { toast.error('Ingresá la API Key de Google Maps'); return }
        setSaving(true)
        const entries = [
            { tenant_id: tenantId, key: 'gmaps_api_key', value: form.gmaps_api_key },
            { tenant_id: tenantId, key: 'gmaps_enabled', value: 'true' },
            { tenant_id: tenantId, key: 'store_address', value: form.store_address },
            { tenant_id: tenantId, key: 'store_lat', value: form.store_lat },
            { tenant_id: tenantId, key: 'store_lng', value: form.store_lng },
        ]
        const { error } = await supabase.from('app_settings').upsert(entries, { onConflict: 'tenant_id,key' })
        setSaving(false)
        if (error) { toast.error('Error: ' + error.message); return }
        toast.success('Google Maps configurado')
        refreshSettings()
        onSaved()
        onClose()
    }

    return (
        <Modal title="Google Maps" icon={MapPin} iconBg="bg-rose-500/20" onClose={onClose}>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-5">
                <p className="text-blue-300 text-xs font-semibold mb-1">¿Dónde obtener la API Key?</p>
                <p className="text-blue-200/70 text-xs leading-relaxed">
                    <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="underline">console.cloud.google.com</a> → APIs &amp; Services → Credentials → Create API Key. Habilitá: <b>Maps JavaScript API</b> y <b>Geocoding API</b>. <b>Restringí la key</b> al dominio de tu local.
                </p>
            </div>
            <div className="space-y-4">
                <SecretInput label="API Key de Google Maps *" value={form.gmaps_api_key} onChange={set('gmaps_api_key')}
                    placeholder="AIzaSy..." hint="Restringí la key por dominio en Google Cloud Console." />
                <div>
                    <label className="block text-xs font-semibold text-white/60 mb-1.5">Dirección del local</label>
                    <input type="text" value={form.store_address} onChange={e => set('store_address')(e.target.value)}
                        placeholder="Av. Corrientes 1234, CABA"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-white/60 mb-1.5">Latitud</label>
                        <input type="text" value={form.store_lat} onChange={e => set('store_lat')(e.target.value)}
                            placeholder="-34.6037"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 font-mono"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-white/60 mb-1.5">Longitud</label>
                        <input type="text" value={form.store_lng} onChange={e => set('store_lng')(e.target.value)}
                            placeholder="-58.3816"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 font-mono"
                        />
                    </div>
                </div>
                <p className="text-white/30 text-xs">💡 Tip: buscá tu dirección en Google Maps, hacé click derecho en el pin y copiá las coordenadas.</p>
            </div>
            <button onClick={handleSave} disabled={saving}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Guardando...' : 'Guardar Google Maps'}
            </button>
        </Modal>
    )
}

// ═══════════════════════════════════════════════
// MODAL: Meta (Instagram + WhatsApp)
// ═══════════════════════════════════════════════
const ModalMeta = ({ onClose, tenantId, onSaved }) => {
    const [form, setForm] = useState({
        ig_page_access_token: '', ig_account_id: '', ig_enabled: false,
        wa_access_token: '', wa_phone_number_id: '', wa_business_account_id: '', wa_enabled: false,
    })
    const [saving, setSaving] = useState(false)
    const [tab, setTab] = useState('ig')

    useEffect(() => {
        supabase.from('meta_credentials')
            .select('ig_account_id, ig_enabled, wa_phone_number_id, wa_business_account_id, wa_enabled')
            .eq('tenant_id', tenantId)
            .maybeSingle()
            .then(({ data }) => { if (data) setForm(f => ({ ...f, ...data })) })
    }, [tenantId])

    const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }))

    const handleSave = async () => {
        setSaving(true)
        const payload = { tenant_id: tenantId, ...form }
        if (form.ig_page_access_token === '••••••••••••••••••') delete payload.ig_page_access_token
        if (form.wa_access_token === '••••••••••••••••••') delete payload.wa_access_token
        const { error } = await supabase.from('meta_credentials').upsert(payload, { onConflict: 'tenant_id' })
        setSaving(false)
        if (error) { toast.error('Error: ' + error.message); return }
        toast.success('Configuración de Meta guardada')
        onSaved()
        onClose()
    }

    return (
        <Modal title="Meta (Instagram + WhatsApp)" icon={MessageCircle} iconBg="bg-purple-500/20" onClose={onClose}>
            {/* Tabs */}
            <div className="flex gap-2 mb-5 bg-white/5 rounded-xl p-1">
                {[{ id: 'ig', label: '📸 Instagram' }, { id: 'wa', label: '💬 WhatsApp' }].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab === t.id ? 'bg-purple-600 text-white' : 'text-white/50 hover:text-white'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'ig' && (
                <div className="space-y-4">
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 mb-2">
                        <p className="text-purple-200/70 text-xs leading-relaxed">
                            Necesitás: cuenta <b>Instagram Business</b> vinculada a una <b>Página de Facebook</b>, y una App en <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="underline">developers.facebook.com</a> con el producto <b>Instagram Graph API</b>.
                        </p>
                    </div>
                    <SecretInput label="Page Access Token" value={form.ig_page_access_token} onChange={set('ig_page_access_token')}
                        placeholder="EAABwzLixnjYBO..." hint="Token de larga duración (60 días). Se renueva automáticamente." />
                    <div>
                        <label className="block text-xs font-semibold text-white/60 mb-1.5">Instagram Account ID</label>
                        <input type="text" value={form.ig_account_id} onChange={e => set('ig_account_id')(e.target.value)}
                            placeholder="17841400123456789"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 font-mono"
                        />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <div className={`w-10 h-6 rounded-full transition-all ${form.ig_enabled ? 'bg-purple-500' : 'bg-white/20'} relative`}
                            onClick={() => set('ig_enabled')(!form.ig_enabled)}>
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.ig_enabled ? 'left-5' : 'left-1'}`} />
                        </div>
                        <span className="text-sm text-white/70">Activar publicaciones en Instagram</span>
                    </label>
                </div>
            )}

            {tab === 'wa' && (
                <div className="space-y-4">
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 mb-2">
                        <p className="text-purple-200/70 text-xs leading-relaxed">
                            Necesitás: número de teléfono verificado en <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="underline">Meta for Developers</a> → Producto <b>WhatsApp</b>. El número <b>no puede estar en la app de WA regular</b>.
                        </p>
                    </div>
                    <SecretInput label="System User Access Token" value={form.wa_access_token} onChange={set('wa_access_token')}
                        placeholder="EAABwzLixnjYBO..." hint="Token permanente de System User (no expira)." />
                    <div>
                        <label className="block text-xs font-semibold text-white/60 mb-1.5">Phone Number ID</label>
                        <input type="text" value={form.wa_phone_number_id} onChange={e => set('wa_phone_number_id')(e.target.value)}
                            placeholder="123456789012345"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 font-mono"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-white/60 mb-1.5">WhatsApp Business Account ID</label>
                        <input type="text" value={form.wa_business_account_id} onChange={e => set('wa_business_account_id')(e.target.value)}
                            placeholder="987654321098765"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 font-mono"
                        />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <div className={`w-10 h-6 rounded-full transition-all ${form.wa_enabled ? 'bg-green-500' : 'bg-white/20'} relative`}
                            onClick={() => set('wa_enabled')(!form.wa_enabled)}>
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.wa_enabled ? 'left-5' : 'left-1'}`} />
                        </div>
                        <span className="text-sm text-white/70">Activar mensajes por WhatsApp</span>
                    </label>
                </div>
            )}

            <button onClick={handleSave} disabled={saving}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Guardando...' : 'Guardar configuración Meta'}
            </button>
        </Modal>
    )
}

// ═══════════════════════════════════════════════
// MODAL: Push Notifications
// ═══════════════════════════════════════════════
const ModalPushNotifications = ({ onClose, tenantId, settings, refreshSettings }) => {
    const [form, setForm] = useState({
        push_notifications_enabled: settings.push_notifications_enabled === 'true',
        push_on_new_order: settings.push_on_new_order !== 'false',
        push_on_order_ready: settings.push_on_order_ready !== 'false',
        push_on_delivery_complete: settings.push_on_delivery_complete !== 'false',
    })
    const [subs, setSubs] = useState(0)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        supabase.from('push_subscriptions')
            .select('id', { count: 'exact' })
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .then(({ count }) => setSubs(count || 0))
    }, [tenantId])

    const set = (k) => () => setForm(f => ({ ...f, [k]: !f[k] }))

    const handleSave = async () => {
        setSaving(true)
        const entries = Object.entries(form).map(([key, value]) => ({
            tenant_id: tenantId, key, value: String(value)
        }))
        const { error } = await supabase.from('app_settings').upsert(entries, { onConflict: 'tenant_id,key' })
        setSaving(false)
        if (error) { toast.error('Error: ' + error.message); return }
        toast.success('Configuración de notificaciones guardada')
        refreshSettings()
        onClose()
    }

    const Toggle = ({ label, value, onChange, description }) => (
        <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
            <div>
                <p className="text-sm text-white font-medium">{label}</p>
                {description && <p className="text-xs text-white/40 mt-0.5">{description}</p>}
            </div>
            <div className={`w-10 h-6 rounded-full transition-all cursor-pointer ${value ? 'bg-orange-500' : 'bg-white/20'} relative shrink-0 ml-4`} onClick={onChange}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${value ? 'left-5' : 'left-1'}`} />
            </div>
        </div>
    )

    return (
        <Modal title="Push Notifications" icon={Bell} iconBg="bg-orange-500/20" onClose={onClose}>
            <div className="flex items-center gap-3 bg-white/5 rounded-xl p-4 mb-5">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <Smartphone size={18} className="text-orange-400" />
                </div>
                <div>
                    <p className="text-sm font-bold text-white">{subs} dispositivos activos</p>
                    <p className="text-xs text-white/40">Suscriptos a notificaciones en tu local</p>
                </div>
                {subs > 0 ? <Wifi size={18} className="text-emerald-400 ml-auto" /> : <WifiOff size={18} className="text-white/30 ml-auto" />}
            </div>
            <div className="bg-white/5 rounded-xl px-4">
                <Toggle label="Activar notificaciones push" value={form.push_notifications_enabled} onChange={set('push_notifications_enabled')}
                    description="Habilita el sistema de notificaciones para este local" />
                <Toggle label="Nuevo pedido recibido" value={form.push_on_new_order} onChange={set('push_on_new_order')}
                    description="Notifica al admin cuando entra un pedido" />
                <Toggle label="Pedido listo" value={form.push_on_order_ready} onChange={set('push_on_order_ready')}
                    description="Notifica al cliente cuando su pedido está listo" />
                <Toggle label="Delivery completado" value={form.push_on_delivery_complete} onChange={set('push_on_delivery_complete')}
                    description="Notifica cuando el repartidor entregó el pedido" />
            </div>
            <button onClick={handleSave} disabled={saving}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Guardando...' : 'Guardar configuración'}
            </button>
        </Modal>
    )
}

// ═══════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════
export default function AdminIntegraciones() {
    const { tenantId } = useTenant()
    const { settings, refreshSettings } = useSettings()
    const [activeModal, setActiveModal] = useState(null)

    // Integration states — fetched on mount
    const [mpStatus, setMpStatus] = useState('pending')
    const [arcaStatus, setArcaStatus] = useState('pending')
    const [metaStatus, setMetaStatus] = useState('pending')

    const fetchStatuses = async () => {
        if (!tenantId) return
        const [mp, arca, meta] = await Promise.all([
            supabase.from('mp_credentials').select('id').eq('tenant_id', tenantId).eq('is_active', true).maybeSingle(),
            supabase.from('afip_credentials').select('id').eq('tenant_id', tenantId).eq('is_active', true).maybeSingle(),
            supabase.from('meta_credentials').select('ig_enabled, wa_enabled').eq('tenant_id', tenantId).maybeSingle(),
        ])
        setMpStatus(mp.data ? 'active' : 'pending')
        setArcaStatus(arca.data ? 'active' : 'pending')
        setMetaStatus(meta.data && (meta.data.ig_enabled || meta.data.wa_enabled) ? 'active' : 'pending')
    }

    useEffect(() => { fetchStatuses() }, [tenantId])

    const gmapsStatus = settings.gmaps_api_key ? 'active' : 'pending'
    const pushStatus = settings.push_notifications_enabled === 'true' ? 'active' : 'pending'

    const integrations = [
        {
            id: 'arca',
            icon: FileText,
            iconBg: 'bg-gradient-to-br from-emerald-600/60 to-emerald-900/60',
            title: 'Facturación ARCA (AFIP)',
            description: 'Emití facturas electrónicas A, B y C directamente desde el sistema. Requiere CUIT y certificado digital.',
            status: arcaStatus,
        },
        {
            id: 'mp',
            icon: CreditCard,
            iconBg: 'bg-gradient-to-br from-sky-600/60 to-sky-900/60',
            title: 'MercadoPago — Cobros Online',
            description: 'Aceptá pagos con tarjeta, débito y MercadoPago. Los clientes pagan al finalizar su pedido.',
            status: mpStatus,
            detail: mpStatus === 'active' ? 'Credenciales de producción configuradas' : null,
        },
        {
            id: 'gmaps',
            icon: MapPin,
            iconBg: 'bg-gradient-to-br from-rose-600/60 to-rose-900/60',
            title: 'Google Maps — Ubicación del Local',
            description: 'Mostrar el mapa interactivo con la ubicación exacta de tu local en el menú público y en el checkout.',
            status: gmapsStatus,
            detail: settings.store_address || null,
        },
        {
            id: 'meta',
            icon: MessageCircle,
            iconBg: 'bg-gradient-to-br from-purple-600/60 to-purple-900/60',
            title: 'Meta — Instagram & WhatsApp',
            description: 'Publicá productos en Instagram y enviá confirmaciones de pedido automáticas por WhatsApp Business.',
            status: metaStatus,
        },
        {
            id: 'push',
            icon: Bell,
            iconBg: 'bg-gradient-to-br from-orange-600/60 to-orange-900/60',
            title: 'Push Notifications (FCM)',
            description: 'Notificaciones en tiempo real para nuevos pedidos, cambios de estado y confirmaciones de entrega.',
            status: pushStatus,
        },
    ]

    return (
        <div className="min-h-screen bg-[var(--color-background)] p-4 sm:p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-black text-white mb-1">Integraciones</h1>
                    <p className="text-white/50 text-sm">Conectá tu local con servicios externos para facturar, cobrar y comunicarte.</p>
                </div>

                {/* Integration Cards */}
                <div className="space-y-3">
                    {integrations.map(i => (
                        <IntegrationCard
                            key={i.id}
                            {...i}
                            onConfigure={() => setActiveModal(i.id)}
                        />
                    ))}
                </div>

                {/* Info footer */}
                <p className="text-center text-white/20 text-xs mt-8">
                    Las credenciales se almacenan de forma segura y aislada por local. Nunca se comparten entre tenants.
                </p>
            </div>

            {/* Modals */}
            {activeModal === 'arca' && (
                <ModalARCA onClose={() => setActiveModal(null)} tenantId={tenantId} onSaved={fetchStatuses} />
            )}
            {activeModal === 'mp' && (
                <ModalMercadoPago onClose={() => setActiveModal(null)} tenantId={tenantId} onSaved={fetchStatuses} />
            )}
            {activeModal === 'gmaps' && (
                <ModalGoogleMaps onClose={() => setActiveModal(null)} tenantId={tenantId} settings={settings} refreshSettings={refreshSettings} onSaved={fetchStatuses} />
            )}
            {activeModal === 'meta' && (
                <ModalMeta onClose={() => setActiveModal(null)} tenantId={tenantId} onSaved={fetchStatuses} />
            )}
            {activeModal === 'push' && (
                <ModalPushNotifications onClose={() => setActiveModal(null)} tenantId={tenantId} settings={settings} refreshSettings={refreshSettings} />
            )}
        </div>
    )
}
