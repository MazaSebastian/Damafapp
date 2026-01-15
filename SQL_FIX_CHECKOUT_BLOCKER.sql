-- Create a secure function to check for open register
-- This allows any user (including anon/guests) to check if the store can receive orders
-- without giving them access to the cash register totals/data.

CREATE OR REPLACE FUNCTION is_register_open()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (admin), bypassing RLS for the caller
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM cash_registers 
    WHERE status = 'open'
  );
END;
$$;

-- Grant execution to everyone (public)
GRANT EXECUTE ON FUNCTION is_register_open TO anon, authenticated, service_role;
