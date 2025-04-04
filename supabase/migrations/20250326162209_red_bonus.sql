/*
  # Update dog policies to require authentication
  
  1. Changes
    - Remove public access to dogs
    - Require authentication for viewing dogs
    - Keep existing CRUD policies for dog owners
  
  2. Security
    - Only authenticated users can view dogs
    - Dog owners retain full CRUD access to their dogs
*/

-- Drop existing policies to avoid conflicts
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view dogs" ON dogs;
  DROP POLICY IF EXISTS "Users can create dogs" ON dogs;
  DROP POLICY IF EXISTS "Users can update their own dogs" ON dogs;
  DROP POLICY IF EXISTS "Users can delete their own dogs" ON dogs;
END $$;

-- Allow only authenticated users to view dogs
CREATE POLICY "Authenticated users can view dogs"
ON dogs
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to create dogs
CREATE POLICY "Users can create dogs"
ON dogs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Allow users to update their own dogs
CREATE POLICY "Users can update their own dogs"
ON dogs
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Allow users to delete their own dogs
CREATE POLICY "Users can delete their own dogs"
ON dogs
FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);