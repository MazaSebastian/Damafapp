-- Add media_type column to rewards table
ALTER TABLE rewards 
ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image'; -- 'image' or 'video'

COMMENT ON COLUMN rewards.media_type IS 'Type of media: image or video';
