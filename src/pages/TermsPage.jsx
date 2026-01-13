import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Scale, Home } from 'lucide-react'

const TermsPage = () => {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-[var(--color-background)] pb-24 text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 bg-[var(--color-surface)]/80 backdrop-blur-md z-50 border-b border-white/5 px-4 py-4">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors text-white">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-xl font-bold">Términos de Servicio</h1>
                    </div>

                    <Link to="/" className="p-2 -mr-2 hover:bg-white/10 rounded-full transition-colors">
                        <Home className="w-6 h-6 text-[var(--color-primary)]" />
                    </Link>
                </div>
            </header>

            <main className="pt-24 px-4 max-w-3xl mx-auto space-y-8">
                <div className="flex flex-col items-center mb-8">
                    <Scale className="w-16 h-16 text-[var(--color-secondary)] mb-4" />
                    <h2 className="text-2xl font-bold text-center">Términos y Condiciones</h2>
                    <p className="text-[var(--color-text-muted)] text-center">Última actualización: Enero 2026</p>
                </div>

                <div className="space-y-6 text-gray-300 leading-relaxed">
                    <section>
                        <h3 className="text-lg font-bold text-white mb-2">1. NATURALEZA DEL SERVICIO</h3>
                        <p>
                            DamafAPP es una plataforma tecnológica de gestión, administración y pedidos online para el rubro gastronómico, operada e impulsada por BurgAPP (en adelante, "La Empresa"). El servicio consiste en proporcionar a los comercios ("El Local") un software de administración y a los usuarios ("El Cliente") una interfaz de pedidos.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-2">2. INDEPENDENCIA DE LAS PARTES</h3>
                        <p>Se deja constancia expresa de que:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-2">
                            <li>
                                <strong className="text-white">DamafAPP no es un restaurante</strong>, no prepara alimentos ni posee personal de cocina.
                            </li>
                            <li>
                                Cada Local que utiliza DamafAPP es un negocio independiente y responsable exclusivo de su operación legal, fiscal y sanitaria.
                            </li>
                            <li>
                                BurgAPP actúa únicamente como el motor tecnológico que conecta la oferta del Local con la demanda del Cliente.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-2">3. EXCLUSIÓN DE RESPONSABILIDAD POR ALIMENTOS (CLAÚSULA CRÍTICA)</h3>
                        <p>El Local es el único responsable de la calidad, cantidad, estado, temperatura, higiene y seguridad de los alimentos entregados.</p>
                        <ul className="list-disc pl-5 mt-2 space-y-2">
                            <li><strong className="text-white">Alérgenos e Ingredientes:</strong> El Local es responsable de la veracidad de la información volcada en su menú digital. DamafAPP/BurgAPP no se responsabiliza por reacciones alérgicas o intoxicaciones derivadas del consumo de los productos.</li>
                            <li><strong className="text-white">Reclamos:</strong> Cualquier disconformidad con el producto final deberá ser gestionada directamente con el Local, quien posee la facultad de realizar reembolsos o reposiciones.</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-2">4. GESTIÓN DE LOGÍSTICA Y ENTREGAS</h3>
                        <p>En los casos donde DamafAPP provea el módulo de logística:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-2">
                            <li>Los repartidores actúan como prestadores de servicios de mensajería independientes.</li>
                            <li>DamafAPP/BurgAPP no garantiza tiempos de entrega fijos, ya que estos pueden verse alterados por factores externos (clima, tráfico, demoras en cocina).</li>
                            <li>La responsabilidad de La Empresa se limita a la trazabilidad tecnológica del pedido y la mediación en caso de incidentes graves durante el traslado.</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-2">5. PAGOS Y SEGURIDAD FINANCIERA</h3>
                        <p>Los pagos electrónicos son procesados por Mercado Pago. El Cliente acepta los términos y condiciones de dicha pasarela al realizar una transacción.</p>
                        <ul className="list-disc pl-5 mt-2 space-y-2">
                            <li>DamafAPP no almacena datos de tarjetas de crédito o débito, cumpliendo con los estándares de seguridad informática vigentes.</li>
                            <li><strong className="text-white">Facturación:</strong> El Local tiene la obligación legal de emitir el ticket o factura correspondiente por la venta de los productos al Cliente.</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-2">6. PROPIEDAD INTELECTUAL</h3>
                        <p>
                            El nombre DamafAPP, la marca BurgAPP, el código fuente, los diseños de interfaz, logotipos y sistemas de fidelización son propiedad exclusiva de La Empresa. Queda prohibida su reproducción o uso sin autorización expresa.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-2">7. POLÍTICA DE FIDELIDAD (BURGER-PUNTOS)</h3>
                        <p>
                            Los beneficios acumulados a través del sistema de fidelidad de DamafAPP son discrecionales. La Empresa o el Local pueden modificar, suspender o cancelar los puntos acumulados si se detectan comportamientos fraudulentos, sin que esto genere derecho a indemnización alguna.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-2">8. PROTECCIÓN DE DATOS Y PRIVACIDAD</h3>
                        <p>
                            Al utilizar el servicio, las partes aceptan que sus datos sean tratados de acuerdo con nuestra Política de Privacidad, enfocada en la correcta prestación del servicio de delivery y la mejora del ecosistema BurgAPP.
                        </p>
                    </section>
                </div>
            </main>
        </div>
    )
}

export default TermsPage
