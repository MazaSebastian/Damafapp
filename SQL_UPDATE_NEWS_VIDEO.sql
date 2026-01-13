-- Add media_type column to distinguish between image and video
ALTER TABLE news_events 
ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image'; -- 'image' or 'video'

COMMENT ON COLUMN news_events.media_type IS 'Type of media: image or video';
