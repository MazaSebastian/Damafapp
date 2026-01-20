export const logCashSale = async (orderId, total, paymentMethod, supabase) => {
    // We now log ALL payment methods to provide a complete report.
    // However, only 'cash' will increase the "Calculated Total" in the UI logic.

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

        // Determine Tag
        let typeTag = '(Efvo)'
        if (paymentMethod === 'transfer') typeTag = '(Transf)'
        if (paymentMethod === 'mercadopago') typeTag = '(MP)'

        // 3. Log Movement
        const { error: moveError } = await supabase
            .from('cash_movements')
            .insert([{
                register_id: openRegister.id,
                amount: total,
                type: 'sale', // We might differentiate later, or keep 'sale' and use description
                description: `Venta #${orderId.slice(0, 6)} ${typeTag}`,
                related_order_id: orderId
            }])

        if (moveError) throw moveError

        return { success: true, message: 'Ingreso registrado en Caja' }

    } catch (error) {
        console.error('Error logging cash sale:', error)
        return { success: false, message: 'Error al registrar en caja: ' + error.message }
    }
}
