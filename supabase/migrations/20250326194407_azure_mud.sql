/*
  # Fix RLS policies and user signup
  
  1. Changes
    - Drop and recreate RLS policies for chat_rooms and profiles
    - Add trigger for automatic profile creation
    - Fix unique constraint on chat_rooms
  
  2. Security
    - Allow public access for profile creation during signup
    - Fix chat room policies to properly handle participant ordering
*/

-- Drop existing policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view their chat rooms" ON chat_rooms;
  DROP POLICY IF EXISTS "Users can create chat rooms with other users" ON chat_rooms;
  DROP POLICY IF EXISTS "Public users can create profiles" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profiles" ON profiles;
  DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
END $$;

-- Fix chat_rooms unique constraint to handle both participant orders
ALTER TABLE chat_rooms DROP CONSTRAINT IF EXISTS chat_rooms_participant1_id_participant2_id_key;
CREATE UNIQUE INDEX chat_rooms_participants_unique ON chat_rooms (
  LEAST(participant1_id, participant2_id),
  GREATEST(participant1_id, participant2_id)
);

-- Create new chat_rooms policies
CREATE POLICY "Users can view their chat rooms"
ON chat_rooms FOR SELECT
TO authenticated
USING (
  auth.uid() IN (participant1_id, participant2_id)
);

CREATE POLICY "Users can create chat rooms"
ON chat_rooms FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (participant1_id, participant2_id) AND
  participant1_id != participant2_id AND
  NOT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = participant1_id AND blocked_id = participant2_id)
    OR (blocker_id = participant2_id AND blocked_id = participant1_id)
  )
);

-- Fix profiles policies
CREATE POLICY "Anyone can create a profile"
ON profiles FOR INSERT
TO public
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Anyone can view profiles"
ON profiles FOR SELECT
TO public
USING (true);

-- Create trigger function for automatic profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();