-- Add address and delivery preferences to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS delivery_shift text;

COMMENT ON COLUMN profiles.address IS 'Full street address for delivery';
COMMENT ON COLUMN profiles.delivery_shift IS 'Preferred delivery time/shift (e.g. Noche, Mediodia)';
