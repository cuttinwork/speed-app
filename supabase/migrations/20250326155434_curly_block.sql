/*
  # Add RLS policies for dogs table

  1. Security
    - Enable RLS on dogs table
    - Add policies for CRUD operations:
      - Everyone can view dogs
      - Only authenticated users can create dogs
      - Only owners can update/delete their dogs
*/

-- Enable RLS
DO $$ BEGIN
  ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Drop existing policies to avoid conflicts
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view dogs" ON dogs;
  DROP POLICY IF EXISTS "Users can create dogs" ON dogs;
  DROP POLICY IF EXISTS "Users can update their own dogs" ON dogs;
  DROP POLICY IF EXISTS "Users can delete their own dogs" ON dogs;
END $$;

-- Allow public access to view all dogs
CREATE POLICY "Anyone can view dogs"
ON dogs
FOR SELECT
TO public
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