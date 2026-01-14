-- 1. Add Payment Method to Orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'mercadopago';

-- 2. Create Cash Registers Table (Sesiones de Caja)
CREATE TABLE IF NOT EXISTS cash_registers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    opened_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    closed_at timestamp with time zone,
    
    opening_amount numeric DEFAULT 0 NOT NULL, -- Monto inicial (Cambio)
    closing_amount numeric, -- Monto contado al cerrar
    
    calculated_amount numeric, -- Monto calculado por sistema (Inicio + Ventas - Gastos)
    difference numeric, -- Closing - Calculated
    
    user_id uuid REFERENCES auth.users(id), -- Quién abrió la caja
    status text DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    notes text
);

-- 3. Create Cash Movements Table (Movimientos: Ventas, Retiros, Ingresos)
CREATE TABLE IF NOT EXISTS cash_movements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    register_id uuid REFERENCES cash_registers(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    amount numeric NOT NULL,
    type text CHECK (type IN ('sale', 'withdrawal', 'deposit', 'expense')), 
    -- sale: venta automática
    -- withdrawal: retiro de ganancia
    -- deposit: ingreso manual
    -- expense: gasto (proveedor, etc)
    
    description text,
    related_order_id uuid REFERENCES orders(id) -- Si es una venta automática
);

-- 4. Enable RLS
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

-- 5. Policies (Only Admins)
CREATE POLICY "Admins can manage cash registers" ON cash_registers
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'owner')))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'owner')));

CREATE POLICY "Admins can manage cash movements" ON cash_movements
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'owner')))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'owner')));

-- 6. Trigger to Auto-Log Cash Sales?
-- Complex logic: We need to know WHICH register is open.
-- Easier to handle this in Application Logic for now (when marking order as paid/delivered).
-- OR: If we want it automatic, we need to find the currently open register.

CREATE OR REPLACE FUNCTION log_cash_sale()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    open_register_id uuid;
BEGIN
    -- Only if payment_method is 'cash' and status changed to 'paid' (or completed?)
    -- Let's say we log it when it becomes 'paid'.
    IF NEW.payment_method = 'cash' AND NEW.status = 'paid' AND (OLD.status != 'paid' OR OLD.status IS NULL) THEN
        
        -- Find open register
        SELECT id INTO open_register_id 
        FROM cash_registers 
        WHERE status = 'open' 
        LIMIT 1;
        
        IF open_register_id IS NOT NULL THEN
            INSERT INTO cash_movements (register_id, amount, type, description, related_order_id)
            VALUES (open_register_id, NEW.total, 'sale', 'Venta #' || NEW.id, NEW.id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger disabled for now. Application logic is safer for MVP to ensure we don't duplicate.
-- But the Trigger is robust if we trust 'paid' status.
-- Let's enable it to automate "Sale" logging.

DROP TRIGGER IF EXISTS on_order_paid_log_cash ON orders;
CREATE TRIGGER on_order_paid_log_cash
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION log_cash_sale();
