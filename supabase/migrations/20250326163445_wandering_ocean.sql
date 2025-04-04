/*
  # Fix Profile Creation During Signup
  
  1. Changes
    - Drop and recreate profile policies to ensure public access for signup
    - Maintain existing security for profile updates and reads
  
  2. Security
    - Allow public users to create profiles (needed for signup)
    - Maintain existing security for profile updates and reads
*/

-- Drop existing policies to avoid conflicts
DO $$ BEGIN
  DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
  DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
  DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
  DROP POLICY IF EXISTS "Enable insert for authentication" ON profiles;
  DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;
  DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
  DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
END $$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Public users can create profiles"
ON profiles
FOR INSERT
TO public
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profiles"
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