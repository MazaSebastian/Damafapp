import React, { useState, useEffect } from 'react';
import { Save, Upload, AlertTriangle, ShieldCheck, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../supabaseClient';

const BillingSettings = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [cuit, setCuit] = useState('');
    const [salesPoint, setSalesPoint] = useState('');
    const [certFile, setCertFile] = useState(null);
    const [keyFile, setKeyFile] = useState(null);
    const [existingConfig, setExistingConfig] = useState(null);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const { data, error } = await supabase
                .from('afip_credentials')
                .select('*')
                .eq('environment', 'production')
                .eq('is_active', true)
                .single();

            if (data) {
                setExistingConfig(data);
                setCuit(data.cuit);
                setSalesPoint(data.sales_point);
            }
        } catch (error) {
            console.error("Error fetching config:", error);
        }
    };

    const readFileContent = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!cuit || !salesPoint) {
            toast.error('Por favor completa CUIT y Punto de Venta');
            return;
        }

        if (!existingConfig && (!certFile || !keyFile)) {
            toast.error('Por favor sube ambos archivos (CRT y KEY) para la configuración inicial');
            return;
        }

        setIsLoading(true);

        try {
            let certContent = existingConfig?.cert_crt;
            let keyContent = existingConfig?.private_key;

            if (certFile) {
                certContent = await readFileContent(certFile);
            }
            if (keyFile) {
                keyContent = await readFileContent(keyFile);
            }

            const upsertData = {
                environment: 'production',
                cuit: cuit.replace(/\D/g, ''), // Remove non-digits
                sales_point: parseInt(salesPoint),
                tax_condition: taxCondition,
                cert_crt: certContent,
                private_key: keyContent,
                is_active: true,
                updated_at: new Date()
            };

            if (existingConfig?.id) {
                const { error } = await supabase
                    .from('afip_credentials')
                    .update(upsertData)
                    .eq('id', existingConfig.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('afip_credentials')
                    .insert(upsertData);
                if (error) throw error;
            }

            toast.success('Configuración Fiscal guardada exitosamente');
            setCertFile(null);
            setKeyFile(null);
            fetchConfig();

        } catch (error) {
            console.error('Error saving config:', error);
            toast.error('Error al guardar: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-yellow-200/80">
                    <p className="font-bold text-yellow-200 mb-1">Información Sensible</p>
                    <p>Estos datos son utilizados para firmar digitalmente tus facturas en AFIP. Asegúrate de subir los archivos correctos (.crt y .key).</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-[var(--color-surface)] border border-white/10 p-6 rounded-3xl space-y-6">
                <div>
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <ShieldCheck className="text-[var(--color-primary)]" />
                        Credenciales Fiscales
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/80">CUIT</label>
                            <input
                                type="text"
                                value={cuit}
                                onChange={(e) => setCuit(e.target.value)}
                                placeholder="20123456789"
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[var(--color-primary)] outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/80">Punto de Venta</label>
                            <input
                                type="number"
                                value={salesPoint}
                                onChange={(e) => setSalesPoint(e.target.value)}
                                placeholder="Ej: 5"
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[var(--color-primary)] outline-none"
                            />
                            <p className="text-xs text-white/40">Debe ser "Web Service" en AFIP.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/80">Condición Fiscal</label>
                            <select
                                value={taxCondition}
                                onChange={(e) => setTaxCondition(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[var(--color-primary)] outline-none"
                            >
                                <option value="monotributo">Responsable Monotributo</option>
                                <option value="inscripto">Responsable Inscripto</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/80">Inicio de Actividades</label>
                            <input
                                type="date"
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[var(--color-primary)] outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-6">
                    <h3 className="text-lg font-bold text-white mb-4">Certificados Digitales</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/80">
                                Certificado (CRT)
                                {existingConfig?.cert_crt && <span className="ml-2 text-emerald-400 text-xs">(Cargado)</span>}
                            </label>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".crt"
                                    onChange={(e) => setCertFile(e.target.files[0])}
                                    className="hidden"
                                    id="crt-upload"
                                />
                                <label
                                    htmlFor="crt-upload"
                                    className={`border-2 border-dashed ${certFile ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 hover:bg-white/5'} rounded-xl p-6 text-center transition-colors cursor-pointer block`}
                                >
                                    {certFile ? (
                                        <div className="flex flex-col items-center text-emerald-400">
                                            <CheckCircle size={24} className="mb-2" />
                                            <span className="text-sm font-medium truncate max-w-full px-2">{certFile.name}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="mx-auto text-white/40 mb-2" size={24} />
                                            <span className="text-sm text-white/60">Click para subir .crt</span>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/80">
                                Clave Privada (KEY)
                                {existingConfig?.private_key && <span className="ml-2 text-emerald-400 text-xs">(Cargado)</span>}
                            </label>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".key"
                                    onChange={(e) => setKeyFile(e.target.files[0])}
                                    className="hidden"
                                    id="key-upload"
                                />
                                <label
                                    htmlFor="key-upload"
                                    className={`border-2 border-dashed ${keyFile ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 hover:bg-white/5'} rounded-xl p-6 text-center transition-colors cursor-pointer block`}
                                >
                                    {keyFile ? (
                                        <div className="flex flex-col items-center text-emerald-400">
                                            <CheckCircle size={24} className="mb-2" />
                                            <span className="text-sm font-medium truncate max-w-full px-2">{keyFile.name}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="mx-auto text-white/40 mb-2" size={24} />
                                            <span className="text-sm text-white/60">Click para subir .key</span>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        disabled={isLoading}
                        type="submit"
                        className="w-full bg-[var(--color-primary)] hover:bg-[#a3e635] text-black font-black py-4 rounded-xl shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></span>
                        ) : (
                            <>
                                <Save size={20} />
                                Guardar Configuración
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BillingSettings;
