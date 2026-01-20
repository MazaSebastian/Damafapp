-- Create function to calculate total revenue efficiently
CREATE OR REPLACE FUNCTION get_total_revenue()
RETURNS numeric
LANGUAGE sql
AS $$
  SELECT COALESCE(SUM(total), 0)
  FROM orders
  WHERE status IN ('paid', 'completed');
$$;
