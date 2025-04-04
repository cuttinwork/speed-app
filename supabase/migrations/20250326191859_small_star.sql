/*
  # Fix Storage Bucket Permissions
  
  1. Changes
    - Ensure profile-photos bucket exists
    - Set up proper public access policies
    - Enable public read access
  
  2. Security
    - Public read access for viewing photos
    - Authenticated users can upload to their own folder
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Clean up any existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Public Access" ON storage.objects;
  DROP POLICY IF EXISTS "Public profile photos access" ON storage.objects;
  DROP POLICY IF EXISTS "Avatar upload access" ON storage.objects;
END $$;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow public read access to profile photos
CREATE POLICY "Public profile photos access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

-- Allow authenticated users to upload profile photos
CREATE POLICY "Avatar upload access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);