import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { toast } from 'sonner'
import { DollarSign, Lock, Unlock, TrendingUp, TrendingDown, RefreshCcw, Save } from 'lucide-react'

const CashManager = () => {
    const [loading, setLoading] = useState(true)
    const [currentRegister, setCurrentRegister] = useState(null)

    // Form States
    const [openingAmount, setOpeningAmount] = useState('')
    const [closingAmount, setClosingAmount] = useState('')
    const [expenseDescription, setExpenseDescription] = useState('')
    const [expenseAmount, setExpenseAmount] = useState('')

    // Stats
    const [stats, setStats] = useState({
        salesCash: 0,
        salesTransfer: 0,
        salesMP: 0,
        expenses: 0,
        withdrawals: 0,
        deposits: 0,
        calculatedTotal: 0
    })

    const [movements, setMovements] = useState([])

    useEffect(() => {
        fetchCurrentRegister()
    }, [])

    const fetchCurrentRegister = async () => {
        setLoading(true)
        try {
            // Find OPEN register
            const { data, error } = await supabase
                .from('cash_registers')
                .select('*')
                .eq('status', 'open')
                .single()

            if (data) {
                setCurrentRegister(data)
                await fetchMovements(data.id, data.opening_amount)
            } else {
                setCurrentRegister(null)
            }
        } catch (error) {
            // Error 406 is 'none found', which is fine (closed)
            // But Supabase JS might return null data on single().
            // We'll assume no open register if error.
            setCurrentRegister(null)
        } finally {
            setLoading(false)
        }
    }

    const fetchMovements = async (registerId, opening) => {
        const { data, error } = await supabase
            .from('cash_movements')
            .select('*')
            .eq('register_id', registerId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error(error)
            return
        }

        setMovements(data)

        // Calculate Stats
        // Calculate Stats
        // Sales split by type based on description tagging from cashUtils
        // (Efvo) -> Cash
        // (Transf) -> Transfer
        // (MP) -> Mercado Pago
        const salesCash = data.filter(m => m.type === 'sale' && m.description?.includes('(Efvo)')).reduce((sum, m) => sum + Number(m.amount), 0)
        const salesTransfer = data.filter(m => m.type === 'sale' && m.description?.includes('(Transf)')).reduce((sum, m) => sum + Number(m.amount), 0)
        const salesMP = data.filter(m => m.type === 'sale' && m.description?.includes('(MP)')).reduce((sum, m) => sum + Number(m.amount), 0)

        // Backward compatibility: If no tag found but type is sale, assume cash if not explicitly something else? 
        // Or check previous logic: !includes('Transf'). 
        // For new system, we rely on tags. For old data, we might need a fallback.
        // Fallback for old data (pre-tag):
        const salesLegacy = data.filter(m => m.type === 'sale' && !m.description?.includes('(')).reduce((sum, m) => sum + Number(m.amount), 0)

        // Combine Legacy into Cash (safest assumption)
        const totalCashSales = salesCash + salesLegacy

        const expenses = data.filter(m => m.type === 'expense').reduce((sum, m) => sum + Number(m.amount), 0)
        const withdrawals = data.filter(m => m.type === 'withdrawal').reduce((sum, m) => sum + Number(m.amount), 0)
        const deposits = data.filter(m => m.type === 'deposit').reduce((sum, m) => sum + Number(m.amount), 0)

        // Total Theoretical = Initial + Cash Sales + Deposits - Expenses - Withdrawals
        // (Transfer sales depend on if we want to count them in the DRAWER money or just as daily revenue)
        // User said: "sumarse al arqueo, y luego logica que discrimine".
        // Usually, 'Arqueo de Caja' matches PHYSICAL money. Transfer is digital.
        // If we add Transfer to 'CalculatedTotal', the closing count (physical) will never match.
        // SO: We show Transfer as a separate revenue stat, but NOT added to the "Effective Cash in Drawer".

        const calculated = Number(opening) + totalCashSales + deposits - expenses - withdrawals

        setStats({
            salesCash: totalCashSales, salesTransfer, salesMP, expenses, withdrawals, deposits, calculatedTotal: calculated
        })
    }

    const handleOpenRegister = async () => {
        if (!openingAmount || isNaN(openingAmount)) {
            toast.error('Ingresa un monto válido')
            return
        }

        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { data, error } = await supabase
                .from('cash_registers')
                .insert([{
                    opening_amount: openingAmount,
                    user_id: user.id,
                    status: 'open'
                }])
                .select()
                .single()

            if (error) throw error

            toast.success('Caja abierta correctamente')
            setCurrentRegister(data)
            await fetchMovements(data.id, data.opening_amount) // Will be empty but inits stats
        } catch (error) {
            toast.error('Error al abrir caja: ' + error.message)
        }
    }

    const handleCloseRegister = async () => {
        if (!closingAmount || isNaN(closingAmount)) {
            toast.error('Ingresa el monto contado')
            return
        }

        const diff = Number(closingAmount) - stats.calculatedTotal

        try {
            const { error } = await supabase
                .from('cash_registers')
                .update({
                    closing_amount: closingAmount,
                    calculated_amount: stats.calculatedTotal,
                    difference: diff,
                    status: 'closed',
                    closed_at: new Date().toISOString()
                })
                .eq('id', currentRegister.id)

            if (error) throw error

            toast.success(`Caja cerrada. Diferencia: $${diff}`)
            setClosingAmount('')
            fetchCurrentRegister()
        } catch (error) {
            toast.error('Error cerrando caja: ' + error.message)
        }
    }

    const handleAddMovement = async (type) => { // type: 'expense' | 'withdrawal' | 'deposit'
        if (!expenseAmount || !expenseDescription) {
            toast.error('Completa monto y descripción')
            return
        }

        try {
            const { error } = await supabase
                .from('cash_movements')
                .insert([{
                    register_id: currentRegister.id,
                    amount: expenseAmount,
                    type: type,
                    description: expenseDescription
                }])

            if (error) throw error

            toast.success('Movimiento registrado')
            setExpenseAmount('')
            setExpenseDescription('')
            fetchMovements(currentRegister.id, currentRegister.opening_amount)
        } catch (error) {
            toast.error(error.message)
        }
    }

    if (loading) return <div className="p-8 text-white">Cargando caja...</div>

    // VIEW: CLOSED (Show Open Form)
    if (!currentRegister) {
        return (
            <div className="max-w-md mx-auto p-6 bg-[var(--color-surface)] rounded-2xl border border-white/5 text-center mt-10">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-[var(--color-text-muted)]" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Caja Cerrada</h2>
                <p className="text-[var(--color-text-muted)] mb-6">Ingresa el monto inicial para comenzar el turno.</p>

                <input
                    type="number"
                    value={openingAmount}
                    onChange={e => setOpeningAmount(e.target.value)}
                    placeholder="Monto de apertura ($)"
                    className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl p-4 text-center text-xl font-bold mb-4 focus:border-[var(--color-primary)] outline-none"
                />

                <button
                    onClick={handleOpenRegister}
                    className="w-full bg-[var(--color-primary)] text-white py-4 rounded-xl font-bold text-lg hover:bg-opacity-90 transition-all"
                >
                    Abrir Caja
                </button>
            </div>
        )
    }

    // VIEW: OPEN (Dashboard)
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">

                {/* LEFT: Live Balance Card */}
                <div className="flex-1 bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <DollarSign className="w-32 h-32 text-white" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 text-green-400 font-bold">
                            <Unlock className="w-4 h-4" /> CAJA ABIERTA
                        </div>
                        <h3 className="text-[var(--color-text-muted)] text-sm uppercase tracking-wide">Saldo en Caja (Teórico)</h3>
                        <p className="text-5xl font-bold text-white mt-2">${stats.calculatedTotal.toFixed(2)}</p>

                    </div>

                    {/* Detailed Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
                        <div className="bg-black/20 p-2 rounded-lg">
                            <p className="text-xs text-[var(--color-text-muted)]">Inicio (Cambio)</p>
                            <p className="font-mono text-lg text-white font-bold">${Number(currentRegister.opening_amount).toFixed(2)}</p>
                        </div>
                        <div className="bg-green-500/10 p-2 rounded-lg border border-green-500/20">
                            <p className="text-xs text-green-400 font-bold mb-1">Ventas Efectivo</p>
                            <p className="font-mono text-lg text-white font-bold">+${stats.salesCash.toFixed(2)}</p>
                        </div>
                        <div className="bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                            <p className="text-xs text-purple-400 font-bold mb-1">Transferencias</p>
                            <p className="font-mono text-lg text-white font-bold">+${stats.salesTransfer.toFixed(2)}</p>
                        </div>
                        <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                            <p className="text-xs text-blue-400 font-bold mb-1">Mercado Pago</p>
                            <p className="font-mono text-lg text-white font-bold">+${stats.salesMP.toFixed(2)}</p>
                        </div>
                        <div className="bg-red-500/10 p-2 rounded-lg border border-red-500/20 col-span-2 lg:col-span-1">
                            <p className="text-xs text-red-400 font-bold mb-1">Gastos / Retiros</p>
                            <p className="font-mono text-lg text-white font-bold">-${(stats.expenses + stats.withdrawals).toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Actions (Close & Add Expense) */}
                <div className="w-full md:w-96 space-y-4">

                    {/* Close Register Form */}
                    <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-white/5">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <RefreshCcw className="w-5 h-5 text-orange-400" /> Arqueo / Cierre
                        </h3>
                        <div className="space-y-3">
                            <input
                                type="number"
                                value={closingAmount}
                                onChange={e => setClosingAmount(e.target.value)}
                                placeholder="Conteo Final (Efectivo real)"
                                className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl p-3"
                            />
                            {closingAmount && (
                                <div className={`text-sm font-bold text-center p-2 rounded-lg ${(Number(closingAmount) - stats.calculatedTotal) >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                    Diferencia: ${(Number(closingAmount) - stats.calculatedTotal).toFixed(2)}
                                </div>
                            )}
                            <button
                                onClick={handleCloseRegister}
                                className="w-full bg-[var(--color-secondary)] text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors"
                            >
                                Cerrar Turno
                            </button>
                        </div>
                    </div>

                    {/* Quick Movement */}
                    <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-white/5">
                        <h3 className="font-bold mb-4 text-sm uppercase text-[var(--color-text-muted)]">Registrar Movimiento</h3>
                        <div className="space-y-3">
                            <input
                                type="text"
                                value={expenseDescription}
                                onChange={e => setExpenseDescription(e.target.value)}
                                placeholder="Descripción (ej: Pago Proveedor)"
                                className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl p-3 text-sm"
                            />
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={expenseAmount}
                                    onChange={e => setExpenseAmount(e.target.value)}
                                    placeholder="$ Monto"
                                    className="flex-1 bg-[var(--color-background)] border border-white/10 rounded-xl p-3 text-sm"
                                />
                                <button onClick={() => handleAddMovement('expense')} className="bg-red-500/20 text-red-500 p-3 rounded-xl hover:bg-red-500/30 font-bold text-xs uppercase">
                                    Gasto
                                </button>
                                <button onClick={() => handleAddMovement('withdrawal')} className="bg-orange-500/20 text-orange-500 p-3 rounded-xl hover:bg-orange-500/30 font-bold text-xs uppercase">
                                    Retiro
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Movements List */}
            <div className="bg-[var(--color-surface)] rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 font-bold">Movimientos de la Sesión</div>
                <div className="max-h-64 overflow-y-auto">
                    {movements.length === 0 ? (
                        <div className="p-8 text-center text-[var(--color-text-muted)] text-sm">No hay movimientos registrados</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="text-[var(--color-text-muted)] bg-black/20">
                                <tr>
                                    <th className="p-3 text-left">Hora</th>
                                    <th className="p-3 text-left">Tipo</th>
                                    <th className="p-3 text-left">Descripción</th>
                                    <th className="p-3 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movements.map(m => (
                                    <tr key={m.id} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="p-3 font-mono text-xs">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td className="p-3 capitalize">
                                            <span className={`px-2 py-1 rounded text-xs font-bold 
                                                ${m.type === 'sale' ? 'bg-green-500/10 text-green-400' :
                                                    m.type === 'expense' ? 'bg-red-500/10 text-red-400' :
                                                        m.type === 'withdrawal' ? 'bg-orange-500/10 text-orange-400' : 'text-white'}`}>
                                                {m.type === 'sale' ? 'Venta' : m.type}
                                            </span>
                                        </td>
                                        <td className="p-3">{m.description || '-'}</td>
                                        <td className={`p-3 text-right font-bold ${m.type === 'sale' || m.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                                            {m.type === 'sale' || m.type === 'deposit' ? '+' : '-'}${Number(m.amount).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div >
    )
}

export default CashManager
