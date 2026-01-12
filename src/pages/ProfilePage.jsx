import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

const ProfilePage = () => {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        zip_code: '',
        birth_date: '',
        // Email is in user.email
    })

    // Separate birth date for UI inputs
    const [dob, setDob] = useState({ day: '', month: '', year: '' })

    useEffect(() => {
        if (user) {
            fetchProfile()
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
                birth_date: data.birth_date || ''
            })

            if (data.birth_date) {
                const [y, m, d] = data.birth_date.split('-')
                setDob({ best_day: d, month: m, year: y, day: d }) // Careful with keys
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
            // Construct birth_date if not read-only scenario (but user said immutable EXCEPT... wait, did they?)
            // "Excepto el mail inicial registrado y la fecha de nacimiento" means READ ONLY.
            // So we don't update birth_date from here if it's already set? 
            // Or maybe it's just that they can't CHANGE it once set?
            // The prompt says "ver y modificar... Excepto... fecha de nacimiento".
            // So I will make inputs disabled if value exists, or just disabled always if fetched.

            // For now, let's assume we update Name, Phone, Zip.

            const updates = {
                id: user.id,
                full_name: formData.full_name,
                phone: formData.phone,
                zip_code: formData.zip_code,
                // birth_date: ... (Immutable)
                // updated_at: new Date() // Column doesn't exist, removing to prevent error
            }

            const { error } = await supabase
                .from('profiles')
                .upsert(updates)

            if (error) throw error
            toast.success('Perfil actualizado correctamente')
        } catch (error) {
            toast.error('Error al actualizar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-[var(--color-background)] pb-20">
            {/* Header */}
            <header className="p-4 flex items-center sticky top-0 bg-[var(--color-background)]/90 backdrop-blur-md z-40 border-b border-white/5">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex-1 text-center pr-8">
                    <img src="/logo-damaf.png" alt="Damaf Logo" className="h-10 w-auto mx-auto drop-shadow-md" />
                </div>
                <div className="w-8"></div> {/* Spacer for center alignment */}
            </header>

            <div className="text-center mt-2 mb-6">
                <h1 className="text-2xl font-bold">Cuenta</h1>
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
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full bg-[var(--color-surface)] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-secondary)] focus:ring-1 focus:ring-[var(--color-secondary)] transition-all"
                                placeholder="+54 9 ..."
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

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-[var(--color-secondary)] text-white font-black text-lg py-3 rounded-full shadow-lg hover:bg-orange-600 transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                        >
                            {saving ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Actualizar'}
                        </button>
                    </form>
                )}

                {/* Footer Links */}
                <div className="mt-8 space-y-4 border-t border-white/5 pt-4">
                    <button className="w-full flex justify-between items-center text-sm font-bold text-white/80 hover:text-white py-2">
                        Política de privacidad <ArrowLeft className="w-4 h-4 rotate-180" />
                    </button>
                    <button className="w-full flex justify-between items-center text-sm font-bold text-white/80 hover:text-white py-2">
                        Términos de servicio <ArrowLeft className="w-4 h-4 rotate-180" />
                    </button>
                </div>
            </main>
        </div>
    )
}

export default ProfilePage
