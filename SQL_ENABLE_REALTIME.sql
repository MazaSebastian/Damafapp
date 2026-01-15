-- Enable Realtime for critical tables
-- This ensures the Admin Panel receives live updates without refreshing.

-- 1. Add tables to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE cash_registers; -- To see status changes
ALTER PUBLICATION supabase_realtime ADD TABLE cash_movements; -- To see sales/expenses

-- 2. Ensure RLS policies allow the admin to receive these events
-- (Already handled by existing policies, but Realtime respects them)
