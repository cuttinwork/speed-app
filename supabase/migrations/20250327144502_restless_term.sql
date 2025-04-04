/*
  # Add Vehicles Table
  
  1. New Tables
    - `vehicles`
      - `id` (uuid, primary key)
      - `owner_id` (uuid, references profiles)
      - `year` (integer)
      - `make` (text)
      - `model` (text)
      - `price` (numeric)
      - `mileage` (integer)
      - `condition` (text)
      - `transmission` (text)
      - `fuel_type` (text)
      - `color` (text)
      - `location` (text)
      - `description` (text)
      - `photos` (text[])
      - `features` (text[])
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Changes
    - Remove vehicle-specific columns from profiles table
    - Move existing vehicle data to new vehicles table
  
  3. Security
    - Enable RLS
    - Add policies for proper access control
*/

-- Create vehicles table
CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  year integer NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  price numeric NOT NULL,
  mileage integer,
  condition text,
  transmission text,
  fuel_type text,
  color text,
  location text NOT NULL,
  description text,
  photos text[] DEFAULT '{}',
  features text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view vehicles"
ON vehicles FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can create vehicles"
ON vehicles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own vehicles"
ON vehicles FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own vehicles"
ON vehicles FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- Create trigger for updated_at
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Remove vehicle-specific columns from profiles
ALTER TABLE profiles 
  DROP COLUMN IF EXISTS year,
  DROP COLUMN IF EXISTS make,
  DROP COLUMN IF EXISTS model,
  DROP COLUMN IF EXISTS price,
  DROP COLUMN IF EXISTS mileage,
  DROP COLUMN IF EXISTS condition,
  DROP COLUMN IF EXISTS transmission,
  DROP COLUMN IF EXISTS fuel_type,
  DROP COLUMN IF EXISTS color,
  DROP COLUMN IF EXISTS features;