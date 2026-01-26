import { DollarSign, FileCheck, Server, RefreshCw, AlertTriangle, Zap } from 'lucide-react'

const BillingOverview = ({ setTab, isConfigured }) => {
    return (
        <div className="space-y-6">

            {!isConfigured ? (
                <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <AlertTriangle className="w-8 h-8 text-orange-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">Configuración Pendiente</h3>
                    <p className="text-[var(--color-text-muted)] max-w-lg mx-auto">
                        Para comenzar a facturar electrónicamente, necesitamos configurar tus credenciales fiscales (CUIT, Punto de Venta y Certificados Digitales).
                    </p>
                    <button
                        onClick={() => setTab('Settings')}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-900/20"
                    >
                        Configurar Ahora
                    </button>
                </div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard
                            title="Total Facturado (Hoy)"
                            value="$0.00"
                            icon={<DollarSign className="text-green-400" />}
                            gradient="from-green-500/10 to-emerald-500/5"
                        />
                        <StatCard
                            title="Último Comprobante"
                            value="-"
                            subVal="Sin actividad reciente"
                            icon={<FileCheck className="text-blue-400" />}
                            gradient="from-blue-500/10 to-cyan-500/5"
                        />
                        <StatCard
                            title="Estado WebServices"
                            value="ONLINE"
                            icon={<Server className="text-purple-400" />}
                            gradient="from-purple-500/10 to-pink-500/5"
                            isStatus
                        />
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ActionCard
                            title="Facturación Manual"
                            desc="Generar una factura A, B o C manualmente sin pedido asociado."
                            icon={<FileCheck />}
                            color="bg-blue-500"
                        />
                        <ActionCard
                            title="Sincronizar Pedidos"
                            desc="Buscar pedidos pendientes de facturación y procesarlos en lote."
                            icon={<RefreshCw />}
                            color="bg-indigo-500"
                        />
                    </div>
                </>
            )}
        </div>
    )
}

const StatCard = ({ title, value, subVal, icon, gradient, isStatus }) => (
    <div className={`p-6 rounded-2xl border border-white/5 bg-gradient-to-br ${gradient} flex flex-col justify-between h-32`}>
        <div className="flex justify-between items-start">
            <span className="text-sm font-bold text-[var(--color-text-muted)] uppercase">{title}</span>
            <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
        </div>
        <div>
            <div className={`text-2xl font-black ${isStatus ? 'text-green-400 tracking-wider' : 'text-white'}`}>
                {value}
            </div>
            {subVal && <div className="text-xs text-[var(--color-text-muted)] mt-1">{subVal}</div>}
        </div>
    </div>
)

const ActionCard = ({ title, desc, icon, color }) => (
    <button className="group relative overflow-hidden bg-[var(--color-surface)] border border-white/5 p-6 rounded-2xl text-left hover:border-white/10 transition-all">
        <div className={`absolute top-0 right-0 w-32 h-32 ${color} opacity-5 rounded-full blur-3xl -mr-10 -mt-10 transition-opacity group-hover:opacity-10`} />

        <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${color} text-white shadow-lg`}>
                {icon}
            </div>
            <div>
                <h4 className="text-lg font-bold text-white mb-1 group-hover:text-[var(--color-primary)] transition-colors">{title}</h4>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{desc}</p>
            </div>
        </div>
    </button>
)

export default BillingOverview
