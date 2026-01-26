import { Upload, Save, ShieldCheck } from 'lucide-react'

const BillingSettings = ({ setIsConfigured }) => {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-[var(--color-surface)] border border-white/5 rounded-2xl p-6 md:p-8">
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/5">
                    <div className="w-12 h-12 bg-[var(--color-primary)]/10 rounded-xl flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-[var(--color-primary)]" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Credenciales Fiscales</h3>
                        <p className="text-sm text-[var(--color-text-muted)]">
                            Configura los datos de acceso a los servicios de ARCA (WebServices).
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* CUIT */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">CUIT Emisor</label>
                        <input
                            type="number"
                            placeholder="20123456789"
                            className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors font-mono"
                        />
                    </div>

                    {/* Punto de Venta */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Punto de Venta</label>
                        <input
                            type="number"
                            placeholder="0001"
                            className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors font-mono"
                        />
                    </div>

                    {/* Certificado (.crt) */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Certificado Digital (.crt)</label>
                        <div className="border-2 border-dashed border-white/10 rounded-xl px-6 py-8 text-center hover:bg-white/5 transition-colors cursor-pointer group">
                            <Upload className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-2 group-hover:text-white transition-colors" />
                            <p className="text-xs text-[var(--color-text-muted)]">Arrastra o haz clic para subir</p>
                        </div>
                    </div>

                    {/* Clave Privada (.key) */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Clave Privada (.key)</label>
                        <div className="border-2 border-dashed border-white/10 rounded-xl px-6 py-8 text-center hover:bg-white/5 transition-colors cursor-pointer group">
                            <Upload className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-2 group-hover:text-white transition-colors" />
                            <p className="text-xs text-[var(--color-text-muted)]">Arrastra o haz clic para subir</p>
                        </div>
                    </div>

                    {/* Fecha Inicio Actividades */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Inicio Actividades</label>
                        <input
                            type="date"
                            className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                        />
                    </div>

                    {/* Condición Fiscal */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Condición Fiscal</label>
                        <select className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors">
                            <option>Responsable Inscripto</option>
                            <option>Monotributo</option>
                            <option>Exento</option>
                        </select>
                    </div>

                </div>

                <div className="mt-8 pt-8 border-t border-white/5 flex justify-end">
                    <button className="bg-[var(--color-primary)] hover:brightness-110 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 transition-all">
                        <Save className="w-5 h-5" />
                        Guardar Configuración
                    </button>
                </div>

            </div>
        </div>
    )
}

export default BillingSettings
