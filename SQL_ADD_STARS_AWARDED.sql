-- Add column to track if stars have been awarded for this order to prevent duplicate rewards
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS stars_awarded BOOLEAN DEFAULT FALSE;

-- Function to atomically add stars to a user profile
CREATE OR REPLACE FUNCTION award_stars(user_id UUID, stars_count INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET stars = COALESCE(stars, 0) + stars_count
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
