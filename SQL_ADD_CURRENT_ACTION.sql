ALTER TABLE checkout_sessions ADD COLUMN IF NOT EXISTS current_action JSONB;
