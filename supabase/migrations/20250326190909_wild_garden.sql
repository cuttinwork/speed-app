/*
  # Update Profile Schema
  
  1. Changes
    - Add new columns for breed and interests
    - Remove redundant username field
    - Add age and weight fields
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS breed text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight numeric;

-- Remove username column (will use auth.users metadata instead)
DO $$ 
BEGIN
  ALTER TABLE profiles DROP COLUMN IF EXISTS username;
EXCEPTION
  WHEN others THEN null;
END $$;