/*
  # Enhance Profiles with Display Name and Contact Info
  
  1. Changes
    - Add display_name column for business/dealer names
    - Add phone_number column
    - Add show_email and show_phone flags for privacy control
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS show_email boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_phone boolean DEFAULT false;