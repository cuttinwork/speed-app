/*
  # Fix Profile RLS Policies
  
  1. Changes
    - Drop existing policies to avoid conflicts
    - Enable RLS on profiles table
    - Create new policies for profile management:
      - Allow users to create their own profile during signup
      - Allow users to manage their own profile
      - Allow public read access for profile information
  
  2. Security
    - Ensures users can only manage their own profiles
    - Maintains public read access for profile information
    - Properly handles profile creation during signup
*/

-- Drop existing policies to avoid conflicts
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;
  DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
END $$;

-- Enable RLS
DO $$ BEGIN
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Allow profile creation during signup
CREATE POLICY "Enable insert for authentication"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow users to manage their own profile
CREATE POLICY "Enable update for users based on id"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow public read access
CREATE POLICY "Enable read access for all users"
ON profiles
FOR SELECT
TO public
USING (true);