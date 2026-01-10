-- 1. Create Story Groups (The circles)
CREATE TABLE story_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES models(id) ON DELETE CASCADE,
  title TEXT, -- Null for "Recent" (default group), has value for "Pinned"
  cover_url TEXT, -- Preview image
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Stories (The individual items inside a circle)
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES story_groups(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image', -- 'image' or 'video'
  duration INT DEFAULT 5, -- Seconds (default 5s for images)
  created_at TIMESTAMPTZ DEFAULT now(),
  posted_date TIMESTAMPTZ DEFAULT now() -- The "Official" date manageable by Devs
);

-- 3. RLS Policies (Security)
ALTER TABLE story_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Allow public read (Anon)
CREATE POLICY "Public Stories Read" ON story_groups FOR SELECT TO anon USING (true);
CREATE POLICY "Public Story Items Read" ON stories FOR SELECT TO anon USING (true);