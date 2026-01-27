import React, { useState } from 'react';
import { DollarSign, FileText, CheckCircle, AlertCircle, PlayCircle, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../supabaseClient';

const BillingOverview = ({ onChangeTab }) => {
    const [isTesting, setIsTesting] = useState(false);

    // Mock Data for UI Dev
    const stats = {
        totalToday: 154200.50,
        lastInvoice: { type: 'Factura C', number: '0002-00001234', amount: 4500.00 },
        status: 'online' // online, offline, error
    };

    const handleTestInvoice = async () => {
        setIsTesting(true);
        const toastId = toast.loading("Generando pedido y factura de prueba...");

        try {
            // 1. Create Dummy Order
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    total: 10,
                    status: 'completed',
                    order_type: 'takeaway',
                    payment_method: 'cash',
                    notes: 'PRUEBA DE FACTURACIÓN'
                })
                .select()
                .single();

            if (orderError) throw new Error("Error creando pedido: " + orderError.message);

            // 2. Trigger Invoice Generation
            // Explicitly getting session to ensure auth header is present
            const { data: { session } } = await supabase.auth.getSession();

            const { data: invoiceData, error: invoiceError } = await supabase.functions.invoke('afip-invoice', {
                body: {
                    action: 'generate',
                    orderId: order.id
                },
                headers: {
                    Authorization: `Bearer ${session?.access_token}`
                }
            });

            if (invoiceError) throw new Error("Error en función de facturación: " + invoiceError.message);

            if (invoiceData?.error) {
                throw new Error("AFIP Error: " + JSON.stringify(invoiceData.error));
            }

            toast.dismiss(toastId);
            toast.success(`Factura Generada! CAE: ${invoiceData.cae}`);
            // Refresh logic could go here
            onChangeTab('invoices');

        } catch (error) {
            console.error(error);
            toast.dismiss(toastId);
            toast.error(error.message);
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Status & Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Facturado Hoy */}
                <div className="bg-[var(--color-surface)] border border-white/10 p-6 rounded-3xl relative overflow-hidden group hover:border-[var(--color-primary)]/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign size={80} />
                    </div>
                    <h3 className="text-white/60 font-medium mb-1">Total Facturado Hoy</h3>
                    <p className="text-4xl font-black text-white tracking-tight">
                        ${stats.totalToday.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-emerald-400 text-sm font-medium bg-emerald-500/10 px-3 py-1 rounded-full w-fit">
                        <CheckCircle size={14} />
                        12 Comprobantes
                    </div>
                </div>

                {/* Último Comprobante */}
                <div className="bg-[var(--color-surface)] border border-white/10 p-6 rounded-3xl relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FileText size={80} />
                    </div>
                    <h3 className="text-white/60 font-medium mb-1">Último Comprobante</h3>
                    <p className="text-2xl font-bold text-white">
                        {stats.lastInvoice.type}
                    </p>
                    <p className="text-white/80 font-mono text-sm mt-1">
                        {stats.lastInvoice.number}
                    </p>
                    <p className="text-xl font-bold text-[var(--color-primary)] mt-2">
                        ${stats.lastInvoice.amount.toLocaleString('es-AR')}
                    </p>
                </div>

                {/* Estado del Servicio */}
                <div className="bg-[var(--color-surface)] border border-white/10 p-6 rounded-3xl flex flex-col justify-between">
                    <div>
                        <h3 className="text-white/60 font-medium mb-1">Estado del Servicio ARCA</h3>
                        <div className="flex items-center gap-3 mt-2">
                            <span className={`relative flex h-3 w-3`}>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                            <span className="text-xl font-bold text-white">Online</span>
                        </div>
                        <p className="text-xs text-white/40 mt-2">
                            Conexión estable con Web Services.
                        </p>
                    </div>
                    <button
                        onClick={() => onChangeTab('settings')}
                        className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-xl transition-colors"
                    >
                        Ver Configuración
                    </button>
                </div>
            </div>

            {/* Quick Actions */}
            <h3 className="text-xl font-bold text-white pt-4">Acciones Rápidas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                    disabled={isTesting}
                    onClick={handleTestInvoice}
                    className="p-4 bg-[var(--color-surface)] border border-white/10 rounded-2xl flex flex-col items-center gap-3 hover:bg-white/5 hover:border-[var(--color-primary)] transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div className="h-12 w-12 rounded-full bg-yellow-500 text-black flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-yellow-500/20">
                        {isTesting ? <Loader2 size={24} className="animate-spin" /> : <PlayCircle size={24} />}
                    </div>
                    <span className="font-bold text-white text-center">Prueba ($10)</span>
                </button>

                <button
                    className="p-4 bg-[var(--color-surface)] border border-white/10 rounded-2xl flex flex-col items-center gap-3 hover:bg-white/5 hover:border-[var(--color-primary)] transition-all group"
                >
                    <div className="h-12 w-12 rounded-full bg-[var(--color-primary)] text-black flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-[var(--color-primary)]/20">
                        <FileText size={24} />
                    </div>
                    <span className="font-bold text-white">Nueva Factura Manual</span>
                </button>

                <button
                    onClick={() => onChangeTab('invoices')}
                    className="p-4 bg-[var(--color-surface)] border border-white/10 rounded-2xl flex flex-col items-center gap-3 hover:bg-white/5 hover:border-white/30 transition-all group"
                >
                    <div className="h-12 w-12 rounded-full bg-white/10 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ArrowRight size={24} />
                    </div>
                    <span className="font-bold text-white">Ver Historial</span>
                </button>
            </div>
        </div>
    );
};

export default BillingOverview;
