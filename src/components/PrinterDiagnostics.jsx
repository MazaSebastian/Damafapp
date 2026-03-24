import { useState, useEffect } from 'react'
import { Printer, Usb, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Wifi, Send } from 'lucide-react'
import { toast } from 'sonner'

/**
 * PrinterDiagnostics — Admin panel to verify connected USB printers,
 * run test prints, and see device status. Only functional inside the
 * Android Wrapper (requires window.AndroidPrint bridge).
 */
const PrinterDiagnostics = () => {
    const [devices, setDevices] = useState([])
    const [loading, setLoading] = useState(false)
    const [isAndroid, setIsAndroid] = useState(false)
    const [testingIndex, setTestingIndex] = useState(null)

    useEffect(() => {
        const android = typeof window.AndroidPrint !== 'undefined'
        setIsAndroid(android)
        if (android) scanDevices()
    }, [])

    const scanDevices = () => {
        if (!window.AndroidPrint?.listUsbDevices) {
            toast.error('Bridge AndroidPrint.listUsbDevices no disponible')
            return
        }

        setLoading(true)
        try {
            const json = window.AndroidPrint.listUsbDevices()
            const parsed = JSON.parse(json)
            setDevices(parsed)

            const printerCount = parsed.filter(d => d.isPrinter).length
            if (printerCount > 0) {
                toast.success(`${printerCount} impresora(s) detectada(s)`)
            } else if (parsed.length > 0) {
                toast.warning(`${parsed.length} dispositivo(s) USB, pero ninguno es impresora`)
            } else {
                toast.warning('No hay dispositivos USB conectados')
            }
        } catch (e) {
            console.error('Scan failed:', e)
            toast.error('Error al escanear dispositivos')
        } finally {
            setLoading(false)
        }
    }

    const testPrint = (deviceIndex) => {
        if (!window.AndroidPrint?.printTestPage) {
            toast.error('Función de test no disponible')
            return
        }

        setTestingIndex(deviceIndex)
        try {
            window.AndroidPrint.printTestPage(deviceIndex)
            toast.info('Enviando página de prueba...')
        } catch (e) {
            toast.error('Error al imprimir test: ' + e.message)
        } finally {
            setTimeout(() => setTestingIndex(null), 2000)
        }
    }

    const legacyTest = () => {
        if (window.AndroidPrint?.testConnection) {
            window.AndroidPrint.testConnection()
        } else {
            toast.warning('No se detectó entorno Android')
        }
    }

    // Not in Android WebView
    if (!isAndroid) {
        return (
            <div className="bg-[var(--color-surface)] rounded-2xl border border-white/5 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                        <Printer className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Diagnóstico de Impresoras</h3>
                        <p className="text-xs text-[var(--color-text-muted)]">Estado de impresoras USB conectadas</p>
                    </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-yellow-400">Modo Web</p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                            El diagnóstico de impresoras USB solo está disponible desde la <strong className="text-white">aplicación Android</strong>.
                            Abrí la app Stacked en tu tablet para verificar las impresoras.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-white/5 p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                        <Printer className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Diagnóstico de Impresoras</h3>
                        <p className="text-xs text-[var(--color-text-muted)]">
                            {devices.length} dispositivo(s) USB &middot; {devices.filter(d => d.isPrinter).length} impresora(s)
                        </p>
                    </div>
                </div>
                <button
                    onClick={scanDevices}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl font-bold text-sm transition-all border border-blue-500/20"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Escanear
                </button>
            </div>

            {/* Device List */}
            {devices.length === 0 ? (
                <div className="bg-[var(--color-background)]/50 rounded-xl p-8 text-center">
                    <Usb className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-3 opacity-30" />
                    <p className="text-sm text-[var(--color-text-muted)]">
                        No hay dispositivos USB conectados
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 opacity-60">
                        Conectá impresoras por USB y tocá "Escanear"
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {devices.map((device) => (
                        <div
                            key={device.deviceId || device.index}
                            className={`bg-[var(--color-background)]/50 rounded-xl p-4 border transition-all ${device.isPrinter
                                    ? 'border-green-500/20 hover:border-green-500/40'
                                    : 'border-white/5 hover:border-white/10'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {/* Status Icon */}
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${device.isPrinter ? 'bg-green-500/10' : 'bg-gray-500/10'
                                        }`}>
                                        {device.isPrinter ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-gray-500" />
                                        )}
                                    </div>

                                    {/* Device Info */}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white text-sm">{device.name}</span>
                                            {device.isPrinter && (
                                                <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold">
                                                    IMPRESORA #{device.printerIndex}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-3 mt-0.5">
                                            <span className="text-[10px] text-[var(--color-text-muted)]">
                                                VID: 0x{device.vendorId?.toString(16).toUpperCase().padStart(4, '0')}
                                            </span>
                                            <span className="text-[10px] text-[var(--color-text-muted)]">
                                                PID: 0x{device.productId?.toString(16).toUpperCase().padStart(4, '0')}
                                            </span>
                                            <span className="text-[10px] text-[var(--color-text-muted)]">
                                                {device.manufacturer}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                {device.isPrinter && (
                                    <button
                                        onClick={() => testPrint(device.printerIndex)}
                                        disabled={testingIndex === device.printerIndex}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs transition-all ${testingIndex === device.printerIndex
                                                ? 'bg-gray-500/20 text-gray-400 cursor-wait'
                                                : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20'
                                            }`}
                                    >
                                        <Send className={`w-3.5 h-3.5 ${testingIndex === device.printerIndex ? 'animate-pulse' : ''}`} />
                                        {testingIndex === device.printerIndex ? 'Imprimiendo...' : 'Test Print'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Legacy Test Button */}
            <div className="pt-2 border-t border-white/5">
                <button
                    onClick={legacyTest}
                    className="text-xs text-[var(--color-text-muted)] hover:text-white transition-colors"
                >
                    🔧 Test de conexión rápido (legacy)
                </button>
            </div>
        </div>
    )
}

export default PrinterDiagnostics
