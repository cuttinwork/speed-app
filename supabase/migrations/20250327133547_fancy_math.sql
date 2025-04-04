/*
  # Convert to Car Marketplace
  
  1. Changes
    - Update profiles table to store car information
    - Remove dog-specific fields
    - Add car-specific fields (year, make, model, price)
    
  2. Security
    - Maintain existing RLS policies
*/

-- Remove dog-specific columns
ALTER TABLE profiles DROP COLUMN IF EXISTS breed;
ALTER TABLE profiles DROP COLUMN IF EXISTS breed_preference;
ALTER TABLE profiles DROP COLUMN IF EXISTS experience_level;
ALTER TABLE profiles DROP COLUMN IF EXISTS age;
ALTER TABLE profiles DROP COLUMN IF EXISTS weight;

-- Add car-specific columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS year integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS make text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS model text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS price numeric;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mileage integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS condition text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS transmission text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fuel_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS features text[];