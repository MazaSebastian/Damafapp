import { useState, useEffect } from 'react'
import { Settings2, Eye, EyeOff, RotateCcw, Save, Ruler } from 'lucide-react'
import { toast } from 'sonner'

const STORAGE_KEY = 'damaf_ticket_config'

/**
 * Default ticket components — each has an id, label, description,
 * and whether it's enabled by default.
 */
const DEFAULT_COMPONENTS = [
    { id: 'header', label: 'Encabezado tienda', description: 'Nombre "DAMAF APP" y sitio web', enabled: true },
    { id: 'datetime', label: 'Fecha y hora', description: 'Fecha y hora del pedido', enabled: true },
    { id: 'order_number', label: 'Número de orden', description: 'Identificador del pedido (#0198)', enabled: true },
    { id: 'client_name', label: 'Nombre del cliente', description: 'Nombre completo del cliente', enabled: true },
    { id: 'client_phone', label: 'Teléfono', description: 'Número de teléfono del cliente', enabled: true },
    { id: 'client_address', label: 'Dirección', description: 'Dirección del cliente (delivery)', enabled: true },
    { id: 'order_type', label: 'Tipo de pedido', description: 'DELIVERY o TAKE AWAY', enabled: true },
    { id: 'scheduled_time', label: 'Hora programada', description: 'Turno de entrega', enabled: true },
    { id: 'items', label: 'Productos', description: 'Lista de items del pedido', enabled: true },
    { id: 'removed_ingredients', label: 'Ingredientes removidos', description: 'SIN Tomate, SIN Lechuga, etc.', enabled: true },
    { id: 'modifiers', label: 'Extras / Adicionales', description: '+ Bacon, + Medallón, etc.', enabled: true },
    { id: 'sides', label: 'Guarniciones', description: 'Papas, Tequeños, etc.', enabled: true },
    { id: 'drinks', label: 'Bebidas', description: 'Coca Cola, Fanta, etc.', enabled: true },
    { id: 'item_notes', label: 'Notas del item', description: 'Notas especiales por producto', enabled: true },
    { id: 'customer_notes', label: 'Notas del cliente', description: 'Notas generales del pedido', enabled: true },
    { id: 'payment_method', label: 'Método de pago', description: 'Efectivo, MercadoPago, etc.', enabled: true },
    { id: 'total', label: 'Total', description: 'Monto total del pedido', enabled: true },
    { id: 'footer', label: 'Pie de ticket', description: 'Mensaje de agradecimiento', enabled: true },
]

const DEFAULT_LABEL_SIZE = { width: 60, height: 40 }
const DEFAULT_RECEIPT_WIDTH = 80

const LABEL_PRESETS = [
    { name: '60x40', width: 60, height: 40 },
    { name: '60x30', width: 60, height: 30 },
    { name: '80x50', width: 80, height: 50 },
    { name: '100x60', width: 100, height: 60 },
    { name: '100x80', width: 100, height: 80 },
    { name: '100x150', width: 100, height: 150 },
]

/**
 * Load full ticket config from localStorage.
 * Returns { components, labelSize, receiptWidth }
 */
export const getTicketConfig = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (!saved) return {
            components: DEFAULT_COMPONENTS,
            labelSize: DEFAULT_LABEL_SIZE,
            receiptWidth: DEFAULT_RECEIPT_WIDTH,
        }

        const parsed = JSON.parse(saved)
        const components = DEFAULT_COMPONENTS.map(def => {
            const s = parsed.components?.find(p => p.id === def.id)
            return s ? { ...def, enabled: s.enabled } : def
        })

        return {
            components,
            labelSize: parsed.labelSize || DEFAULT_LABEL_SIZE,
            receiptWidth: parsed.receiptWidth || DEFAULT_RECEIPT_WIDTH,
        }
    } catch {
        return {
            components: DEFAULT_COMPONENTS,
            labelSize: DEFAULT_LABEL_SIZE,
            receiptWidth: DEFAULT_RECEIPT_WIDTH,
        }
    }
}

/**
 * Returns an object like { header: true, datetime: false, ... }
 * for quick lookup in the print formatter.
 */
export const getEnabledFlags = () => {
    const { components } = getTicketConfig()
    const flags = {}
    components.forEach(c => { flags[c.id] = c.enabled })
    return flags
}

/**
 * TicketDesigner — Visual config panel for choosing which
 * components appear on the printed ticket.
 */
const TicketDesigner = () => {
    const [config, setConfig] = useState(() => getTicketConfig())
    const [hasChanges, setHasChanges] = useState(false)

    const { components, labelSize, receiptWidth } = config

    const toggle = (id) => {
        setConfig(prev => ({
            ...prev,
            components: prev.components.map(c =>
                c.id === id ? { ...c, enabled: !c.enabled } : c
            ),
        }))
        setHasChanges(true)
    }

    const setLabelSize = (width, height) => {
        setConfig(prev => ({ ...prev, labelSize: { width, height } }))
        setHasChanges(true)
    }

    const setReceiptWidth = (w) => {
        setConfig(prev => ({ ...prev, receiptWidth: w }))
        setHasChanges(true)
    }

    const resetDefaults = () => {
        setConfig({
            components: DEFAULT_COMPONENTS,
            labelSize: DEFAULT_LABEL_SIZE,
            receiptWidth: DEFAULT_RECEIPT_WIDTH,
        })
        setHasChanges(true)
    }

    const saveConfig = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
        setHasChanges(false)
        toast.success('Diseño de ticket guardado ✅')
    }

    const enabledCount = components.filter(c => c.enabled).length

    return (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-white/5 p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                        <Settings2 className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Diseño de Ticket</h3>
                        <p className="text-xs text-[var(--color-text-muted)]">
                            {enabledCount} de {components.length} componentes activos
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={resetDefaults}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[var(--color-text-muted)] hover:text-white rounded-lg text-xs font-bold transition-all"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset
                    </button>
                    {hasChanges && (
                        <button
                            onClick={saveConfig}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs font-bold transition-all border border-green-500/20 animate-pulse"
                        >
                            <Save className="w-3.5 h-3.5" />
                            Guardar
                        </button>
                    )}
                </div>
            </div>

            {/* Paper Size Config */}
            <div className="bg-[var(--color-background)]/60 rounded-xl p-4 border border-white/5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                    <Ruler className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-bold text-white">Tamaño del papel</span>
                </div>

                {/* Label Printer Size */}
                <div>
                    <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold mb-2">
                        Etiquetadora (XP-470B) — {labelSize.width}x{labelSize.height} mm
                    </p>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {LABEL_PRESETS.map(preset => (
                            <button
                                key={preset.name}
                                onClick={() => setLabelSize(preset.width, preset.height)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${labelSize.width === preset.width && labelSize.height === preset.height
                                        ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40'
                                        : 'bg-white/5 text-[var(--color-text-muted)] hover:bg-white/10 border border-white/5'
                                    }`}
                            >
                                {preset.name} mm
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[var(--color-text-muted)]">Ancho:</span>
                            <input
                                type="number"
                                value={labelSize.width}
                                onChange={(e) => setLabelSize(parseInt(e.target.value) || 60, labelSize.height)}
                                className="w-16 bg-[var(--color-background)] border border-white/10 rounded px-2 py-1 text-xs text-white text-center"
                            />
                            <span className="text-[10px] text-[var(--color-text-muted)]">mm</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[var(--color-text-muted)]">Alto:</span>
                            <input
                                type="number"
                                value={labelSize.height}
                                onChange={(e) => setLabelSize(labelSize.width, parseInt(e.target.value) || 40)}
                                className="w-16 bg-[var(--color-background)] border border-white/10 rounded px-2 py-1 text-xs text-white text-center"
                            />
                            <span className="text-[10px] text-[var(--color-text-muted)]">mm</span>
                        </div>
                    </div>
                </div>

                {/* Receipt Printer Width */}
                <div className="pt-3 border-t border-white/5">
                    <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold mb-2">
                        Comandera (ESC/POS) — {receiptWidth} mm
                    </p>
                    <div className="flex gap-2">
                        {[58, 72, 80].map(w => (
                            <button
                                key={w}
                                onClick={() => setReceiptWidth(w)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${receiptWidth === w
                                        ? 'bg-green-500/30 text-green-300 border border-green-500/40'
                                        : 'bg-white/5 text-[var(--color-text-muted)] hover:bg-white/10 border border-white/5'
                                    }`}
                            >
                                {w} mm
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Preview Bar */}
            <div className="bg-[var(--color-background)]/60 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold mb-2">Vista previa del ticket</p>
                <div className="bg-white rounded-lg p-3 text-black text-[11px] font-mono leading-relaxed max-h-48 overflow-y-auto">
                    {components.filter(c => c.enabled).map(c => (
                        <div key={c.id} className="border-b border-gray-200 last:border-0 py-0.5">
                            {c.id === 'header' && <div className="text-center font-bold text-sm">DAMAF APP</div>}
                            {c.id === 'datetime' && <div>Fecha: 25/03/2026  Hora: 21:30</div>}
                            {c.id === 'order_number' && <div className="text-center font-bold text-lg">#0198</div>}
                            {c.id === 'client_name' && <div>Cliente: <b>Seba Maza</b></div>}
                            {c.id === 'client_phone' && <div>Tel: 1136434314</div>}
                            {c.id === 'client_address' && <div>Calle: Av. San Martín 1234</div>}
                            {c.id === 'order_type' && <div className="text-center font-bold text-base">TAKE AWAY</div>}
                            {c.id === 'scheduled_time' && <div className="text-center">Turno: <b>22:00</b></div>}
                            {c.id === 'items' && <div className="font-bold">1 x Americana</div>}
                            {c.id === 'removed_ingredients' && <div className="text-red-600 pl-2">  SIN Tomate</div>}
                            {c.id === 'modifiers' && <div className="text-green-700 pl-2">  + Bacon</div>}
                            {c.id === 'sides' && <div className="pl-2">  Guarnición: Tequeños x3</div>}
                            {c.id === 'drinks' && <div className="pl-2">  Bebida: Fanta</div>}
                            {c.id === 'item_notes' && <div className="pl-2 italic">  (Nota: Sin sal)</div>}
                            {c.id === 'customer_notes' && <div className="bg-yellow-50 p-1 rounded mt-1">📝 Nota: Tocar timbre</div>}
                            {c.id === 'payment_method' && <div className="font-bold">PAGO: EFECTIVO</div>}
                            {c.id === 'total' && <div className="font-bold text-base">TOTAL: $25.800</div>}
                            {c.id === 'footer' && <div className="text-center text-gray-500 text-[9px] mt-1">¡Gracias por tu compra!</div>}
                        </div>
                    ))}
                    {enabledCount === 0 && (
                        <div className="text-center text-gray-400 py-4">Ticket vacío — activa al menos un componente</div>
                    )}
                </div>
            </div>

            {/* Component Toggles */}
            <div className="space-y-1.5">
                {components.map(comp => (
                    <button
                        key={comp.id}
                        onClick={() => toggle(comp.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${comp.enabled
                                ? 'bg-[var(--color-background)]/50 border border-green-500/20 hover:border-green-500/40'
                                : 'bg-[var(--color-background)]/30 border border-white/5 hover:border-white/10 opacity-60'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${comp.enabled ? 'bg-green-500/20' : 'bg-gray-500/10'
                                }`}>
                                {comp.enabled ? (
                                    <Eye className="w-3.5 h-3.5 text-green-400" />
                                ) : (
                                    <EyeOff className="w-3.5 h-3.5 text-gray-500" />
                                )}
                            </div>
                            <div className="text-left">
                                <span className={`text-sm font-bold ${comp.enabled ? 'text-white' : 'text-gray-500'}`}>
                                    {comp.label}
                                </span>
                                <p className="text-[10px] text-[var(--color-text-muted)]">{comp.description}</p>
                            </div>
                        </div>

                        <div className={`w-10 h-5 rounded-full transition-all relative ${comp.enabled ? 'bg-green-500' : 'bg-gray-600'
                            }`}>
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${comp.enabled ? 'left-5' : 'left-0.5'
                                }`} />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )
}

export default TicketDesigner
