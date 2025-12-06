-- Add missing columns to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS free_prompt_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS enable_dyad_pro BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS provider_settings JSONB;

