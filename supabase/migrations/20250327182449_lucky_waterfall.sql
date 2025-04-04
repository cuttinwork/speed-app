/*
  # Add email column to profiles table
  
  1. Changes
    - Add email column to store user's email address
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add email column to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS email text;