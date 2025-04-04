/*
  # Fix Vehicles Table Migration
  
  1. Changes
    - Make migration idempotent with IF NOT EXISTS checks
    - Safely create table and policies
    - Handle case where table already exists
  
  2. Security
    - Maintain RLS policies
    - Keep existing security rules
*/

-- Safely create vehicles table if it doesn't exist
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS vehicles (
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
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Enable RLS if not already enabled
DO $$ BEGIN
  ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Drop existing policies to avoid conflicts
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view vehicles" ON vehicles;
  DROP POLICY IF EXISTS "Users can create vehicles" ON vehicles;
  DROP POLICY IF EXISTS "Users can update their own vehicles" ON vehicles;
  DROP POLICY IF EXISTS "Users can delete their own vehicles" ON vehicles;
END $$;

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

-- Create trigger for updated_at if it doesn't exist
DO $$ BEGIN
  CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;