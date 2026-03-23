import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../supabaseClient'
import { ArrowRight, Loader2, Mail, Lock, Phone, User } from 'lucide-react'
import { countryCodes } from '../utils/countryCodes'
import DeliveryMap from '../components/DeliveryMap'
import { useTenant } from '../context/TenantContext'
import { useTenantNav } from '../hooks/useTenantNav'

const RegisterPage = () => {
    const navigate = useNavigate()
    const { tenantId, tenantLogo, tenantName } = useTenant()
    const tenantNav = useTenantNav()
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [storeLocation, setStoreLocation] = useState(null)
    const [fullName, setFullName] = useState('')
    const [phoneData, setPhoneData] = useState({ countryCode: '+54', number: '' })
    const [addressData, setAddressData] = useState({ address: '', floor: '', department: '', postal_code: '' })
    const [dob, setDob] = useState({ day: '', month: '', year: '' })
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!tenantId) return
        const fetchSettings = async () => {
            const { data } = await supabase.from('app_settings').select('*').eq('tenant_id', tenantId)
            if (data) {
                const settings = {}
                data.forEach(item => settings[item.key] = item.value)
                if (settings.store_lat && settings.store_lng) {
                    setStoreLocation({
                        lat: parseFloat(settings.store_lat),
                        lng: parseFloat(settings.store_lng)
                    })
                }
            }
        }
        fetchSettings()
    }, [tenantId])

    // Registration fields
    const [showSuccessModal, setShowSuccessModal] = useState(false)

    const validatePassword = (pwd) => {
        if (pwd.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
        if (!/[A-Z]/.test(pwd)) return 'Debe contener al menos una mayúscula'
        if (!/[0-9]/.test(pwd)) return 'Debe contener al menos un número'
        return null
    }

    const handleRegister = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // Validate fields
            if (!fullName.trim()) throw new Error('El nombre es requerido')
            if (!phoneData.number) throw new Error('El teléfono es requerido')
            if (!addressData.address) throw new Error('La dirección es requerida')
            if (!dob.day || !dob.month || !dob.year) throw new Error('La fecha de nacimiento es requerida')

            // Password strength validation
            const passwordError = validatePassword(password)
            if (passwordError) throw new Error(passwordError)

            const fullPhone = `${phoneData.countryCode} ${phoneData.number}`.trim()
            // Ensure 2 digits for day/month
            const formattedDay = dob.day.padStart(2, '0')
            const formattedMonth = dob.month.padStart(2, '0')
            const birthDate = `${dob.year}-${formattedMonth}-${formattedDay}`

            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        phone: fullPhone,
                        birth_date: birthDate,
                        address: addressData.address,
                        floor: addressData.floor,
                        department: addressData.department,
                        postal_code: addressData.postal_code,
                        tenant_id: tenantId
                    }
                }
            })

            if (signUpError) throw signUpError

            if (signUpData.user) {
                setShowSuccessModal(true)
            } else {
                toast.info('Registro iniciado. Por favor, revisa tu email para confirmar tu cuenta.')
            }
        } catch (err) {
            setError(err.message)
            toast.error('Error: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-background)] p-4 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-[#1a1a2e] to-transparent opacity-50 z-0"></div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[var(--color-surface)] border border-white/10 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Decoding effect background */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-500 to-emerald-400"></div>

                        <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                            <Mail className="w-8 h-8 text-green-500 animate-bounce" />
                        </div>

                        <h2 className="text-2xl font-black text-white mb-2">¡Cuenta Creada!</h2>
                        <p className="text-gray-300 mb-6 leading-relaxed">
                            Te enviamos un enlace de confirmación a <span className="text-white font-bold">{email}</span>.
                            <br /><br />
                            <span className="text-sm opacity-75">Por favor verifícalo para activar tu cuenta.</span>
                        </p>

                        <button
                            onClick={() => tenantNav.navigate('/login')}
                            className="w-full bg-white text-black font-black py-4 rounded-xl hover:scale-105 transition-transform shadow-xl"
                        >
                            Ir a Iniciar Sesión
                        </button>
                    </div>
                </div>
            )}

            <div className="z-10 w-full max-w-sm my-8">
                {/* Brand Logo Section */}
                <div className="flex flex-col items-center mb-8">
                    <img src={tenantLogo || '/logo-stacked.png'} alt={tenantName} className="h-24 w-auto drop-shadow-2xl mb-4 hover:scale-105 transition-transform" />
                    <p className="text-[var(--color-text-muted)] text-center max-w-xs">
                        Únete al club y disfruta de las mejores hamburguesas.
                    </p>
                </div>

                <div className="bg-[var(--color-surface)]/80 backdrop-blur-md p-8 rounded-3xl border border-white/5 shadow-2xl">
                    <form onSubmit={handleRegister} className="space-y-4">

                        {/* Name */}
                        <div className="space-y-2">
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-secondary)] transition-all"
                                    placeholder="Nombre completo"
                                    required
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-secondary)] transition-all"
                                    placeholder="tu-email@ejemplo.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-secondary)] transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            {/* Password Strength Indicator */}
                            {password.length > 0 && (
                                <div className="space-y-2 px-1">
                                    <div className="flex gap-1">
                                        <div className={`h-1 flex-1 rounded-full transition-colors ${password.length >= 8 ? 'bg-green-500' : 'bg-white/10'}`} />
                                        <div className={`h-1 flex-1 rounded-full transition-colors ${/[A-Z]/.test(password) ? 'bg-green-500' : 'bg-white/10'}`} />
                                        <div className={`h-1 flex-1 rounded-full transition-colors ${/[0-9]/.test(password) ? 'bg-green-500' : 'bg-white/10'}`} />
                                    </div>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
                                        <span className={password.length >= 8 ? 'text-green-400' : 'text-gray-500'}>✓ 8+ caracteres</span>
                                        <span className={/[A-Z]/.test(password) ? 'text-green-400' : 'text-gray-500'}>✓ Mayúscula</span>
                                        <span className={/[0-9]/.test(password) ? 'text-green-400' : 'text-gray-500'}>✓ Número</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <select
                                    value={phoneData.countryCode}
                                    onChange={(e) => setPhoneData({ ...phoneData, countryCode: e.target.value })}
                                    className="w-[90px] bg-[var(--color-background)] border border-white/10 rounded-xl px-2 py-3.5 text-white focus:outline-none focus:border-[var(--color-secondary)] text-sm appearance-none cursor-pointer"
                                >
                                    {countryCodes.map((c) => (
                                        <option key={c.code} value={c.code}>
                                            {c.flag} {c.code}
                                        </option>
                                    ))}
                                </select>
                                <div className="relative flex-1">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="tel"
                                        value={phoneData.number}
                                        onChange={(e) => setPhoneData({ ...phoneData, number: e.target.value })}
                                        className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-secondary)] transition-all"
                                        placeholder="Número"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Birth Date */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] ml-1 block">Fecha de nacimiento</label>
                            <div className="grid grid-cols-3 gap-2">
                                <input
                                    type="number"
                                    value={dob.day}
                                    onChange={(e) => setDob({ ...dob, day: e.target.value })}
                                    placeholder="Día"
                                    className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-2 py-3.5 text-center text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-secondary)] transition-all"
                                    required
                                    min="1" max="31"
                                />
                                <input
                                    type="number"
                                    value={dob.month}
                                    onChange={(e) => setDob({ ...dob, month: e.target.value })}
                                    placeholder="Mes"
                                    className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-2 py-3.5 text-center text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-secondary)] transition-all"
                                    required
                                    min="1" max="12"
                                />
                                <input
                                    type="number"
                                    value={dob.year}
                                    onChange={(e) => setDob({ ...dob, year: e.target.value })}
                                    placeholder="Año"
                                    className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-2 py-3.5 text-center text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-secondary)] transition-all"
                                    required
                                    min="1900"
                                    max={new Date().getFullYear()}
                                />
                            </div>
                        </div>

                        {/* Address Section */}
                        <div className="space-y-2">
                            <div className="relative">
                                <DeliveryMap
                                    storeLocation={storeLocation}
                                    onAddressSelected={(data) => {
                                        // data = { address, lat, lng }
                                        setAddressData(prev => ({ ...prev, address: data.address }))
                                    }}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    value={addressData.floor}
                                    onChange={(e) => setAddressData({ ...addressData, floor: e.target.value })}
                                    placeholder="Piso"
                                    className="bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-secondary)] transition-all"
                                />
                                <input
                                    type="text"
                                    value={addressData.department}
                                    onChange={(e) => setAddressData({ ...addressData, department: e.target.value })}
                                    placeholder="Depto"
                                    className="bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-secondary)] transition-all"
                                />
                            </div>
                        </div>

                        {/* Zip Code (Optional) */}
                        <div className="space-y-2">
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 flex items-center justify-center font-bold text-xs border border-gray-500 rounded">CP</div>
                                <input
                                    type="text"
                                    value={addressData.postal_code}
                                    onChange={(e) => setAddressData({ ...addressData, postal_code: e.target.value })}
                                    className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-secondary)] transition-all"
                                    placeholder="Código Postal (Opcional)"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-[var(--color-secondary)] to-orange-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-orange-500/25 transition-all flex justify-center items-center gap-2 group transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed mt-6"
                        >
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                                <>
                                    Crear Cuenta
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-white/5">
                        <p className="text-[var(--color-text-muted)] text-sm">
                            ¿Ya tienes cuenta?{' '}
                            <Link
                                to={tenantNav.path('/login')}
                                className="text-[var(--color-secondary)] font-bold hover:underline ml-1"
                            >
                                Inicia Sesión
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RegisterPage
