import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, Home } from 'lucide-react'

const PrivacyPolicyPage = () => {
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
                        <h1 className="text-xl font-bold">Políticas de Privacidad</h1>
                    </div>

                    <Link to="/" className="p-2 -mr-2 hover:bg-white/10 rounded-full transition-colors">
                        <Home className="w-6 h-6 text-[var(--color-primary)]" />
                    </Link>
                </div>
            </header>

            <main className="pt-24 px-4 max-w-3xl mx-auto space-y-8">
                <div className="flex flex-col items-center mb-8">
                    <Shield className="w-16 h-16 text-[var(--color-primary)] mb-4" />
                    <h2 className="text-2xl font-bold text-center">Términos y Privacidad</h2>
                    <p className="text-[var(--color-text-muted)] text-center">Última actualización: Enero 2026</p>
                </div>

                <div className="space-y-6 text-gray-300 leading-relaxed">
                    <section>
                        <h3 className="text-lg font-bold text-white mb-2">1. Identificación del Responsable y del Ecosistema</h3>
                        <p>
                            BurgAPP (en adelante "La Plataforma") es una solución tecnológica desarrollada por [Tu Nombre/Empresa]. La Plataforma provee el software de gestión y pedidos denominado Damafapp a distintos comercios independientes (en adelante "El Comercio").
                        </p>
                        <p className="mt-2">
                            Al utilizar la aplicación de un Comercio específico o la aplicación centralizada BurgAPP, usted acepta que sus datos sean tratados bajo los términos aquí descritos.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-2">2. Relación entre BurgAPP y los Locales</h3>
                        <p>Es fundamental aclarar al usuario:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-2">
                            <li>
                                <strong className="text-white">Independencia:</strong> Cada local que utiliza la tecnología Damafapp es un ente jurídico independiente.
                            </li>
                            <li>
                                <strong className="text-white">Datos Compartidos:</strong> Los datos que el usuario ingresa en la app de un local específico son almacenados en la infraestructura centralizada de BurgAPP para garantizar el funcionamiento del servicio, la logística y el sistema de fidelidad.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-2">3. Datos que Recolectamos</h3>
                        <p>Para que el sistema de delivery y administración sea efectivo, recolectamos:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-2">
                            <li><strong className="text-white">Información de Registro:</strong> Nombre, correo electrónico y teléfono.</li>
                            <li><strong className="text-white">Datos de Ubicación:</strong> Necesarios para la logística de entrega y mostrar locales cercanos.</li>
                            <li><strong className="text-white">Historial de Pedidos:</strong> Para el funcionamiento del sistema de "Burger-Puntos" (Loyalty) y preferencias de usuario.</li>
                            <li><strong className="text-white">Tokens de Notificación:</strong> Identificadores de dispositivo para el envío de alertas push sobre el estado del pedido.</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-2">4. Uso de la Información</h3>
                        <p>Los datos serán utilizados para:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-2">
                            <li>Procesar y gestionar pedidos de comida.</li>
                            <li>Gestionar la logística de entrega a través de repartidores.</li>
                            <li>Administrar el sistema de puntos y recompensas del ecosistema BurgAPP.</li>
                            <li>Enviar notificaciones críticas sobre el estado de la compra.</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-2">5. Transferencia de Datos a Terceros</h3>
                        <p>El usuario acepta que BurgAPP comparta sus datos con:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-2">
                            <li><strong className="text-white">El Comercio:</strong> Para que puedan preparar y facturar su pedido.</li>
                            <li><strong className="text-white">Repartidores:</strong> Únicamente nombre, dirección y teléfono para concretar la entrega.</li>
                            <li><strong className="text-white">Pasarelas de Pago:</strong> (Ej. Mercado Pago) para procesar transacciones de forma segura. BurgAPP no almacena datos de tarjetas de crédito/débito.</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-2">6. Geolocalización y Notificaciones Push</h3>
                        <p>Se informará al usuario que:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-2">
                            <li><strong className="text-white">Segundo Plano:</strong> La app de logística (repartidores) recolecta datos de ubicación incluso en segundo plano para permitir el seguimiento del pedido por parte del cliente.</li>
                            <li><strong className="text-white">Push:</strong> El usuario puede revocar el permiso de notificaciones desde los ajustes del sistema operativo, aunque esto afectará la experiencia del servicio.</li>
                        </ul>
                    </section>
                </div>
            </main>
        </div>
    )
}

export default PrivacyPolicyPage
