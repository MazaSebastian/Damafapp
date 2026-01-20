-- Add a column to store the item currently being customized
ALTER TABLE checkout_sessions 
ADD COLUMN IF NOT EXISTS current_action JSONB DEFAULT NULL;

-- Force schema cache reload just in case
NOTIFY pgrst, 'reload schema';
