import { Search, Download, Eye, ExternalLink } from 'lucide-react'

const BillingList = () => {
    // Mock Data
    const invoices = []

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
                <div className="flex-1 bg-[var(--color-surface)] border border-white/5 rounded-xl flex items-center px-4 py-2">
                    <Search className="w-4 h-4 text-[var(--color-text-muted)] mr-3" />
                    <input
                        type="text"
                        placeholder="Buscar por CAE, número o cliente..."
                        className="bg-transparent border-none focus:outline-none text-white w-full text-sm"
                    />
                </div>
                <select className="bg-[var(--color-surface)] border border-white/5 rounded-xl px-4 py-2 text-white text-sm focus:outline-none">
                    <option>Todos los tipos</option>
                    <option>Factura A</option>
                    <option>Factura B</option>
                    <option>Factura C</option>
                    <option>Notas de Crédito</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-[var(--color-surface)] border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 border-b border-white/5">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--color-text-muted)] uppercase">Fecha</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--color-text-muted)] uppercase">Comprobante</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--color-text-muted)] uppercase">Cliente</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--color-text-muted)] uppercase">CAE</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--color-text-muted)] uppercase text-right">Monto</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--color-text-muted)] uppercase text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {invoices.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-[var(--color-text-muted)] italic">
                                    No hay comprobantes generados aún.
                                </td>
                            </tr>
                        ) : (
                            invoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 text-sm text-white">{inv.date}</td>
                                    <td className="px-6 py-4 text-sm font-mono text-white">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold mr-2 ${inv.type === 'A' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            {inv.type}
                                        </span>
                                        {inv.number}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-300">{inv.client}</td>
                                    <td className="px-6 py-4 text-xs font-mono text-gray-500">{inv.cae}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-white text-right">${inv.amount}</td>
                                    <td className="px-6 py-4 flex justify-center gap-2">
                                        <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default BillingList
