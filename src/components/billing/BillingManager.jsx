import { useState } from 'react'
import { FileText, Settings, List, TrendingUp, AlertCircle } from 'lucide-react'
import BillingOverview from './BillingOverview'
import BillingList from './BillingList'
import BillingSettings from './BillingSettings'

const BillingManager = () => {
    const [activeTab, setActiveTab] = useState('Overview')
    // Mock configuration check (This would come from DB later)
    const [isConfigured, setIsConfigured] = useState(false)

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold flex items-center gap-3 text-white">
                        <FileText className="w-8 h-8 text-[var(--color-primary)]" />
                        Centro de Facturación
                    </h2>
                    <p className="text-[var(--color-text-muted)] mt-1">
                        Gestiona tus comprobantes electrónicos y conexión con ARCA (ex AFIP).
                    </p>
                </div>

                {!isConfigured && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 rounded-xl flex items-center gap-2 text-yellow-500 text-sm font-bold">
                        <AlertCircle className="w-4 h-4" />
                        Sistema No Configurado
                    </div>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 p-1 bg-[var(--color-surface)] rounded-xl border border-white/5 w-fit">
                <TabButton
                    active={activeTab === 'Overview'}
                    onClick={() => setActiveTab('Overview')}
                    icon={<TrendingUp className="w-4 h-4" />}
                    label="Vista General"
                />
                <TabButton
                    active={activeTab === 'Invoices'}
                    onClick={() => setActiveTab('Invoices')}
                    icon={<List className="w-4 h-4" />}
                    label="Comprobantes"
                />
                <TabButton
                    active={activeTab === 'Settings'}
                    onClick={() => setActiveTab('Settings')}
                    icon={<Settings className="w-4 h-4" />}
                    label="Configuración"
                />
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {activeTab === 'Overview' && <BillingOverview setTab={setActiveTab} isConfigured={isConfigured} />}
                {activeTab === 'Invoices' && <BillingList />}
                {activeTab === 'Settings' && <BillingSettings setIsConfigured={setIsConfigured} />}
            </div>
        </div>
    )
}

const TabButton = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
            ${active
                ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-purple-900/20'
                : 'text-[var(--color-text-muted)] hover:bg-white/5 hover:text-white'
            }
        `}
    >
        {icon}
        {label}
    </button>
)

export default BillingManager
