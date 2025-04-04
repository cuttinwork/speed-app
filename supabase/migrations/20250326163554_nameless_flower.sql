/*
  # Fix Profile Creation During Signup
  
  1. Changes
    - Drop and recreate profile policies to ensure public access for signup
    - Keep existing security for profile updates and reads
  
  2. Security
    - Allow public users to create profiles (needed for signup flow)
    - Maintain authenticated-only updates
    - Keep public read access
*/

-- Drop ALL existing profile policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public users can create profiles" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profiles" ON profiles;
  DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
  DROP POLICY IF EXISTS "Enable insert for authentication" ON profiles;
  DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;
  DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
  DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;
  DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
END $$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create new policies with correct permissions
CREATE POLICY "Anyone can create a profile during signup"
ON profiles
FOR INSERT
TO public  -- This is key - allowing public access for signup
WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can update their own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Anyone can view profiles"
ON profiles
FOR SELECT
TO public
USING (true);