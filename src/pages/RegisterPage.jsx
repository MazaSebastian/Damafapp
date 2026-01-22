import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../supabaseClient'
import { ArrowRight, Loader2, Mail, Lock, Phone, User } from 'lucide-react'
import { countryCodes } from '../utils/countryCodes'
import AddressAutocomplete from '../components/AddressAutocomplete'

const RegisterPage = () => {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    // Registration fields
    const [fullName, setFullName] = useState('')
    const [phoneData, setPhoneData] = useState({ countryCode: '+54', number: '' })
    const [dob, setDob] = useState({ day: '', month: '', year: '' })
    const [addressData, setAddressData] = useState({ address: '', floor: '', department: '', postal_code: '' })

    const [error, setError] = useState(null)

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
                        postal_code: addressData.postal_code
                    }
                }
            })

            if (signUpError) throw signUpError

            if (signUpData.user) {
                toast.success('Registro exitoso! Revisa tu email para confirmar.')
                navigate('/login')
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

            <div className="z-10 w-full max-w-sm my-8">
                {/* Brand Logo Section */}
                <div className="flex flex-col items-center mb-8">
                    <img src="/logo-damaf.png" alt="DAMAFAPP" className="h-24 w-auto drop-shadow-2xl mb-4 hover:scale-105 transition-transform" />
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
                                <AddressAutocomplete
                                    onSelect={(address) => setAddressData(prev => ({ ...prev, address }))}
                                    placeholder="Dirección completa"
                                    className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3.5 pl-10 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-secondary)] transition-all"
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
                                to="/login"
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
