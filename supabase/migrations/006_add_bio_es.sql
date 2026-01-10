-- Add bio_es column for Spanish translations
ALTER TABLE models 
ADD COLUMN bio_es TEXT DEFAULT NULL;

