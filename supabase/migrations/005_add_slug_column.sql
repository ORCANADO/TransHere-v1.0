-- 1. Add the column
ALTER TABLE models ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Populate it using the name (Converts "Alice Wonder" -> "alice-wonder")
UPDATE models SET slug = lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g'));

-- 3. Make it faster to search and ensure no duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_models_slug ON models(slug);

