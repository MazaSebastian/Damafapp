import React from 'react';
import { FileText, Download, User } from 'lucide-react';

const BillingList = () => {
    const [invoices, setInvoices] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const { data, error } = await import('../../supabaseClient')
                .then(module => module.supabase
                    .from('invoices')
                    .select('*, order:order_id(customer:customer_id(name, business_name))')
                    .order('created_at', { ascending: false })
                );

            if (error) throw error;

            const formattedInvoices = data.map(inv => ({
                id: inv.id,
                date: new Date(inv.created_at).toLocaleDateString('es-AR'),
                type: inv.cbte_tipo === 11 ? 'Factura C' : (inv.cbte_tipo === 6 ? 'Factura B' : 'Factura A'),
                number: `${inv.pt_vta.toString().padStart(4, '0')}-${inv.cbte_nro.toString().padStart(8, '0')}`,
                amount: inv.total_amount,
                customer: inv.order?.customer?.business_name || inv.order?.customer?.name || 'Consumidor Final',
                cae: inv.cae,
                // Pass raw data for PDF generator
                ...inv
            }));

            setInvoices(formattedInvoices);
        } catch (error) {
            console.error("Error fetching invoices:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = async (invoice) => {
        // Mock Company Data (In real app, fetch from settings/context)
        const companyData = {
            business_name: 'DamafAPP S.A.',
            address: 'Calle Falsa 123',
            city: 'Buenos Aires',
            cuit: '20-12345678-9',
            start_date: '01/01/2024'
        };

        const invoiceData = {
            cbte_tipo: invoice.cbte_tipo,
            pt_vta: invoice.pt_vta,
            cbte_nro: invoice.cbte_nro,
            total_amount: invoice.total_amount,
            created_at: invoice.created_at,
            cae: invoice.cae,
            cae_due_date: invoice.cae_due_date,
            customer_name: invoice.customer,
            customer_doc: '0', // TODO: Fetch from customer relation if available
            customer_iva: 'Consumidor Final',
            items: [{ quantity: 1, name: 'Consumo Gastronómico', price: invoice.total_amount }]
        };

        if (window.confirm(`¿Descargar PDF de la factura ${invoice.number}?`)) {
            try {
                const { generateInvoicePDF } = await import('../../utils/invoiceGenerator');
                await generateInvoicePDF(invoiceData, companyData);
            } catch (e) {
                console.error("Error generating PDF:", e);
                alert("Error generando PDF");
            }
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Historial de Comprobantes</h3>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Buscar por cliente o número..."
                        className="bg-[var(--color-surface)] border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[var(--color-primary)] w-64"
                    />
                </div>
            </div>

            <div className="bg-[var(--color-surface)] border border-white/10 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-white/60">
                            <tr>
                                <th className="p-4 font-medium">Fecha</th>
                                <th className="p-4 font-medium">Comprobante</th>
                                <th className="p-4 font-medium">Cliente</th>
                                <th className="p-4 font-medium">CAE</th>
                                <th className="p-4 font-medium text-right">Monto</th>
                                <th className="p-4 font-medium text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {invoices.map((inv) => (
                                <tr key={inv.id} className="text-white hover:bg-white/5 transition-colors">
                                    <td className="p-4">{inv.date}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-[var(--color-primary)] text-black text-xs font-bold px-1.5 rounded">
                                                {inv.type.split(' ')[1]}
                                            </span>
                                            <span className="font-mono text-white/80">{inv.number}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 text-white/80">
                                            <User size={14} />
                                            {inv.customer}
                                        </div>
                                    </td>
                                    <td className="p-4 font-mono text-xs text-white/60">{inv.cae}</td>
                                    <td className="p-4 text-right font-bold">
                                        ${inv.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-4 flex justify-center gap-2">
                                        <button className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors" title="Ver PDF">
                                            <FileText size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDownloadPDF(inv)}
                                            className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-[var(--color-primary)] transition-colors"
                                            title="Descargar PDF"
                                        >
                                            <Download size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {invoices.length === 0 && (
                <div className="text-center py-12 text-white/40">
                    No hay comprobantes generados aún.
                </div>
            )}
        </div>
    );
};

export default BillingList;
