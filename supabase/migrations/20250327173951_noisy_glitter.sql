/*
  # Add avatar_url column to profiles table
  
  1. Changes
    - Add avatar_url column to store profile picture URLs
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add avatar_url column if it doesn't exist
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS avatar_url text;