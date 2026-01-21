-- Rename category_slug to category to match frontend
ALTER TABLE modifiers 
RENAME COLUMN category_slug TO category;

-- Or add it if we want both (but better to just rename for now based on error)
-- If we want to be safe, we can add it:
-- ALTER TABLE modifiers ADD COLUMN category text default 'General';
