-- Add fcm_token column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fcm_token text;

-- Optional: Index for faster searches if sending bulk notifications
CREATE INDEX IF NOT EXISTS idx_profiles_fcm_token ON profiles(fcm_token);

COMMENT ON COLUMN profiles.fcm_token IS 'Firebase Cloud Messaging token for push notifications';
