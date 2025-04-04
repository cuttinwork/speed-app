/*
  # Fix profiles table RLS policies

  1. Changes
    - Add INSERT policy to allow authenticated users to create their own profile
    - Add UPDATE policy to allow users to update their own profile
    - Add SELECT policy to allow public access to profiles

  2. Security
    - Users can only create/update their own profile (id must match auth.uid())
    - Anyone can view profiles (needed for displaying dog owner information)
*/

-- Allow users to create their own profile
CREATE POLICY "Users can create their own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow public access to profiles (needed for displaying dog owner information)
CREATE POLICY "Profiles are viewable by everyone"
ON profiles
FOR SELECT
TO public
USING (true);