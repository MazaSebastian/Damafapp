import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, Loader2, Home, User, Star, Gift, LogIn, Bell, MapPin, LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { countryCodes } from '../utils/countryCodes'
import { requestForToken } from '../services/messaging'
import DeliveryMap from '../components/DeliveryMap'
import { useTenantNav } from '../hooks/useTenantNav'
import { useTenant } from '../context/TenantContext'

const ProfilePage = () => {
    const { user, signOut } = useAuth()
    const navigate = useNavigate()
    const tenantNav = useTenantNav()
    const { tenantLogo, tenantName } = useTenant()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showMap, setShowMap] = useState(false) // Toggle Map
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        zip_code: '',
        birth_date: '',
        address: '',
        lat: null, // New
        lng: null, // New
        customer_id: null
    })

    // Separate phone state for UI
    const [phoneData, setPhoneData] = useState({ countryCode: '+54', number: '' })

    // Separate birth date for UI inputs
    const [dob, setDob] = useState({ day: '', month: '', year: '' })

    useEffect(() => {
        if (user) {
            fetchProfile()
        } else {
            setLoading(false)
        }
    }, [user])

    const fetchProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (error) throw error

            setFormData({
                full_name: data.full_name || '',
                phone: data.phone || '',
                zip_code: data.zip_code || '',
                birth_date: data.birth_date || '',
                address: data.address || '',
                lat: data.lat || null, // Load if exists
                lng: data.lng || null, // Load if exists
                customer_id: data.customer_id
            })

            if (data.phone) {
                // Simplistic parsing: check if starts with any known code
                const foundCode = countryCodes.find(c => data.phone.startsWith(c.code))
                if (foundCode) {
                    setPhoneData({
                        countryCode: foundCode.code,
                        number: data.phone.replace(foundCode.code, '').trim()
                    })
                } else {
                    setPhoneData({ countryCode: '+54', number: data.phone })
                }
            } else {
                setPhoneData({ countryCode: '+54', number: '' })
            }

            if (data.birth_date) {
                const [y, m, d] = data.birth_date.split('-')
                setDob({ day: d, month: m, year: y })
            }
        } catch (error) {
            console.error('Error fetching profile:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdate = async (e) => {
        e.preventDefault()
        setSaving(true)

        try {
            const fullPhone = `${phoneData.countryCode} ${phoneData.number}`.trim()

            const updates = {
                id: user.id, // Restored ID for upsert
                full_name: formData.full_name,
                phone: fullPhone,
                zip_code: formData.zip_code,
                address: formData.address,
                lat: formData.lat, // Save Coordinates
                lng: formData.lng, // Save Coordinates
                updated_at: new Date().toISOString()
            }

            const { error } = await supabase
                .from('profiles')
                .upsert(updates)

            if (error) throw error
            toast.success('Perfil actualizado correctamente')
            setShowMap(false) // Close map on save if open
        } catch (error) {
            toast.error('Error al actualizar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const handleAddressSelected = (data) => {
        if (data && typeof data === 'object') {
            setFormData(prev => ({
                ...prev,
                address: data.address,
                lat: data.lat,
                lng: data.lng
            }))
            // Optional: Don't close map immediately, let user confirm
        }
    }

    // Guest View
    if (!loading && !user) {
        return (
            <div className="min-h-screen bg-[var(--color-background)] pb-20">
                <header className="p-4 flex items-center sticky top-0 bg-[var(--color-background)]/90 backdrop-blur-md z-40 border-b border-white/5">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex-1 text-center pr-2">
                        <span className="font-bold text-lg">Mi Cuenta</span>
                    </div>
                    <Link to={tenantNav.path('/')} className="p-2 -mr-2 text-white hover:bg-white/10 rounded-full transition-colors">
                        <Home className="w-6 h-6 text-[var(--color-primary)]" />
                    </Link>
                </header>

                <main className="px-6 py-10 max-w-md mx-auto flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                        <User className="w-10 h-10 text-[var(--color-text-muted)]" />
                    </div>

                    <h1 className="text-2xl font-bold mb-2 text-white">Modo Invitado</h1>
                    <p className="text-[var(--color-text-muted)] mb-8 max-w-[80%]">
                        Estás navegando como invitado. Crea una cuenta para acceder a todos los beneficios.
                    </p>

                    <div className="grid grid-cols-1 gap-4 w-full mb-8">
                        <div className="bg-[var(--color-surface)] p-4 rounded-2xl flex items-center gap-4 text-left border border-white/5">
                            <div className="bg-yellow-500/10 p-2 rounded-lg">
                                <Star className="w-6 h-6 text-yellow-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">Suma Puntos</h3>
                                <p className="text-xs text-[var(--color-text-muted)]">Gana estrellas en cada compra</p>
                            </div>
                        </div>
                        <div className="bg-[var(--color-surface)] p-4 rounded-2xl flex items-center gap-4 text-left border border-white/5">
                            <div className="bg-purple-500/10 p-2 rounded-lg">
                                <Gift className="w-6 h-6 text-purple-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">Premios Exclusivos</h3>
                                <p className="text-xs text-[var(--color-text-muted)]">Canjea tus puntos por comida</p>
                            </div>
                        </div>
                    </div>

                    <div className="w-full space-y-3">
                        <Link to={tenantNav.path('/register')} className="block w-full bg-[var(--color-secondary)] text-white font-black text-lg py-3.5 rounded-full shadow-lg hover:bg-orange-600 transition-transform active:scale-95">
                            Crear Cuenta
                        </Link>
                        <Link to={tenantNav.path('/login')} className="block w-full bg-transparent border border-white/10 text-white font-bold text-lg py-3.5 rounded-full hover:bg-white/5 transition-colors">
                            Iniciar Sesión
                        </Link>
                    </div>

                    <div className="mt-12 space-y-4 border-t border-white/5 pt-4 w-full">
                        <Link to={tenantNav.path('/privacy')} className="w-full flex justify-between items-center text-sm font-bold text-white/80 hover:text-white py-2">
                            Política de privacidad <ArrowLeft className="w-4 h-4 rotate-180" />
                        </Link>
                        <Link to={tenantNav.path('/terms')} className="w-full flex justify-between items-center text-sm font-bold text-white/80 hover:text-white py-2">
                            Términos de servicio <ArrowLeft className="w-4 h-4 rotate-180" />
                        </Link>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[var(--color-background)] pb-20">
            {/* Header */}
            <header className="p-4 flex items-center sticky top-0 bg-[var(--color-background)]/90 backdrop-blur-md z-40 border-b border-white/5">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex-1 text-center pr-2">
                    <img src={tenantLogo || '/logo-stacked.png'} alt={tenantName} className="h-10 w-auto mx-auto drop-shadow-md" />
                </div>
                <Link to={tenantNav.path('/')} className="p-2 -mr-2 text-white hover:bg-white/10 rounded-full transition-colors">
                    <Home className="w-6 h-6 text-[var(--color-primary)]" />
                </Link>
            </header>

            <div className="text-center mt-2 mb-6">
                <h1 className="text-2xl font-bold">Cuenta</h1>
                {formData.customer_id && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                        <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-bold">ID Cliente:</span>
                        <span className="text-sm font-bold text-white">#{formData.customer_id}</span>
                    </div>
                )}
            </div>

            <main className="px-6 max-w-md mx-auto">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-[var(--color-secondary)]" />
                    </div>
                ) : (
                    <form onSubmit={handleUpdate} className="space-y-6">
                        {/* Email (Read Only) */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] ml-1">Tu correo electrónico *</label>
                            <input
                                type="text"
                                value={user.email}
                                disabled
                                className="w-full bg-[var(--color-surface)] border border-white/10 rounded-xl px-4 py-3 text-white/50 cursor-not-allowed focus:outline-none"
                            />
                        </div>

                        {/* Name */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] ml-1">Nombre *</label>
                            <input
                                type="text"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full bg-[var(--color-surface)] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-secondary)] focus:ring-1 focus:ring-[var(--color-secondary)] transition-all"
                                placeholder="Nombre completo"
                            />
                        </div>

                        {/* Phone */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] ml-1">Número de teléfono</label>
                            <div className="flex gap-2">
                                <select
                                    value={phoneData.countryCode}
                                    onChange={(e) => setPhoneData({ ...phoneData, countryCode: e.target.value })}
                                    className="w-[100px] bg-[var(--color-surface)] border border-white/10 rounded-xl px-2 py-3 text-white focus:outline-none focus:border-[var(--color-secondary)] focus:ring-1 focus:ring-[var(--color-secondary)] text-sm appearance-none cursor-pointer"
                                >
                                    {countryCodes.map((c) => (
                                        <option key={c.code} value={c.code}>
                                            {c.flag} {c.code}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="tel"
                                    value={phoneData.number}
                                    onChange={(e) => setPhoneData({ ...phoneData, number: e.target.value })}
                                    className="flex-1 bg-[var(--color-surface)] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-secondary)] focus:ring-1 focus:ring-[var(--color-secondary)] transition-all"
                                    placeholder="Número sin 0 ni 15"
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-[var(--color-text-muted)] ml-1">Dirección (Calle y Altura)</label>
                                <button
                                    type="button"
                                    onClick={() => setShowMap(!showMap)}
                                    className="text-xs text-[var(--color-secondary)] font-bold hover:underline flex items-center gap-1"
                                >
                                    <MapPin className="w-3 h-3" /> {showMap ? 'Ocultar Mapa' : 'Buscar en Mapa'}
                                </button>
                            </div>

                            {showMap && (
                                <div className="mb-4 rounded-xl overflow-hidden border border-white/10 animated-slide-down">
                                    <DeliveryMap
                                        storeLocation={null} // Default to settings within component
                                        onAddressSelected={handleAddressSelected}
                                        onDistanceCalculated={() => { }} // Not needed here but prop exists
                                    />
                                </div>
                            )}

                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="w-full bg-[var(--color-surface)] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-secondary)] focus:ring-1 focus:ring-[var(--color-secondary)] transition-all"
                                placeholder="Ej: Av. San Martin 1234"
                            />
                        </div>


                        {/* Birth Date (Read Only) */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] ml-1">Fecha de nacimiento</label>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                    <input
                                        type="text"
                                        value={dob.year}
                                        disabled
                                        placeholder="Año"
                                        className="w-full bg-[var(--color-surface)] border border-white/10 rounded-xl px-4 py-3 text-center text-white/50 cursor-not-allowed"
                                    />
                                    <span className="text-[10px] text-gray-500 pl-1">AAAA</span>
                                </div>
                                <div className="space-y-1">
                                    <input
                                        type="text"
                                        value={dob.month}
                                        disabled
                                        placeholder="Mes"
                                        className="w-full bg-[var(--color-surface)] border border-white/10 rounded-xl px-4 py-3 text-center text-white/50 cursor-not-allowed"
                                    />
                                    <span className="text-[10px] text-gray-500 pl-1">MM</span>
                                </div>
                                <div className="space-y-1">
                                    <input
                                        type="text"
                                        value={dob.day}
                                        disabled
                                        placeholder="Dia"
                                        className="w-full bg-[var(--color-surface)] border border-white/10 rounded-xl px-4 py-3 text-center text-white/50 cursor-not-allowed"
                                    />
                                    <span className="text-[10px] text-gray-500 pl-1">DD</span>
                                </div>
                            </div>
                        </div>

                        {/* Zip Code */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] ml-1">Código Postal</label>
                            <input
                                type="text"
                                value={formData.zip_code}
                                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                                className="w-full bg-[var(--color-surface)] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-secondary)] focus:ring-1 focus:ring-[var(--color-secondary)] transition-all"
                                placeholder="1234"
                            />
                        </div>



                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-[var(--color-secondary)] text-white font-black text-lg py-3 rounded-full shadow-lg hover:bg-orange-600 transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                        >
                            {saving ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Actualizar'}
                        </button>

                        {/* Notification Permission Button */}
                        <div className="pt-4 border-t border-white/5">
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!user?.id) {
                                        toast.error('Error crítico: No hay ID de usuario. Recarga la página.');
                                        return;
                                    }
                                    toast.info('Solicitando permiso...');
                                    const { token, error } = await requestForToken(user.id);

                                    if (token) {
                                        toast.success('Notificaciones activadas correctamente 🔔');
                                    } else {
                                        // Handle specific errors
                                        console.error('Notification Error:', error);
                                        if (error === 'missing_config') {
                                            toast.error('Error: Faltan credenciales de Firebase.');
                                        } else if (error === 'permission_denied') {
                                            toast.error('Permiso denegado. Revisa la config del navegador.');
                                        } else if (error === 'missing_user_id') {
                                            toast.error('Error: ID de usuario perdido.');
                                        } else if (error && error.includes('db_save_error')) {
                                            // Show the full DB error to the user for checking
                                            toast.error('Error BD: ' + error.replace('db_save_error: ', ''));
                                        } else {
                                            toast.error('Error: ' + (error || 'Desconocido'));
                                        }
                                    }
                                }}
                                className="w-full flex items-center justify-center gap-2 bg-[var(--color-surface)] border border-white/10 text-white font-bold text-sm py-3 rounded-xl hover:bg-white/5 transition-colors"
                            >
                                <Bell className="w-4 h-4 text-[var(--color-primary)]" />
                                Activar Notificaciones
                            </button>
                            <p className="text-[10px] text-center text-[var(--color-text-muted)] mt-2">
                                Activa las notificaciones para saber cuando tu pedido esté listo.
                            </p>
                        </div>

                        {/* Logout Button */}
                        <div className="pt-4 border-t border-white/5">
                            <button
                                type="button"
                                onClick={async () => {
                                    const toastId = toast.loading('Cerrando sesión...')
                                    try {
                                        await signOut()
                                        toast.dismiss(toastId)
                                    } catch (error) {
                                        toast.error('Error al salir', { id: toastId })
                                    }
                                }}
                                className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-sm py-3 rounded-xl hover:bg-red-500/20 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Cerrar Sesión
                            </button>
                        </div>
                    </form>
                )}

                {/* Footer Links */}
                <div className="mt-8 space-y-4 border-t border-white/5 pt-4">
                    <Link to={tenantNav.path('/privacy')} className="w-full flex justify-between items-center text-sm font-bold text-white/80 hover:text-white py-2">
                        Política de privacidad <ArrowLeft className="w-4 h-4 rotate-180" />
                    </Link>
                    <Link to={tenantNav.path('/terms')} className="w-full flex justify-between items-center text-sm font-bold text-white/80 hover:text-white py-2">
                        Términos de servicio <ArrowLeft className="w-4 h-4 rotate-180" />
                    </Link>
                </div>
            </main>
        </div >
    )
}

export default ProfilePage
