export const logCashSale = async (orderId, total, paymentMethod, supabase) => {
    // Determine type based on payment method
    // Both Cash and Transfer are logged.
    // 'mercadopago' (Online) is NOT logged in this manual register (usually).
    if (paymentMethod !== 'cash' && paymentMethod !== 'transfer') return { success: true, message: 'Online payment - not logged in register' }

    try {
        // 1. Find Open Register
        const { data: openRegister, error: registerError } = await supabase
            .from('cash_registers')
            .select('id')
            .eq('status', 'open')
            .single()

        if (registerError || !openRegister) {
            console.warn('No open cash register found. Cash sale not logged automatically.')
            return { success: false, message: 'Caja cerrada: No se registró el ingreso automáticamente.' }
        }

        // 2. Check if movement already exists to avoid duplicates (optional but safe)
        const { data: existingMove } = await supabase
            .from('cash_movements')
            .select('id')
            .eq('related_order_id', orderId)
            .single()

        if (existingMove) {
            return { success: true, message: 'Movimiento ya registrado' }
        }

        // 3. Log Movement
        const { error: moveError } = await supabase
            .from('cash_movements')
            .insert([{
                register_id: openRegister.id,
                amount: total,
                type: 'sale', // We might differentiate later, or keep 'sale' and use description
                description: `Venta #${orderId.slice(0, 6)} (${paymentMethod === 'transfer' ? 'Transf' : 'Efvo'})`,
                related_order_id: orderId
            }])

        if (moveError) throw moveError

        return { success: true, message: 'Ingreso registrado en Caja' }

    } catch (error) {
        console.error('Error logging cash sale:', error)
        return { success: false, message: 'Error al registrar en caja: ' + error.message }
    }
}
