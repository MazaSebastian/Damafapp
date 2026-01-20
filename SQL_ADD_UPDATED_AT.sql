-- Add updated_at column to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

COMMENT ON COLUMN profiles.updated_at IS 'Timestamp of last profile update';
