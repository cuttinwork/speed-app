/*
  # Add username column to profiles table
  
  1. Changes
    - Add username column to profiles table
    - Make it nullable since existing profiles won't have it
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add username column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles (username);