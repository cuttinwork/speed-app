/*
  # Add Storage Policies for Image Uploads
  
  1. Changes
    - Create a new storage bucket for dog images if it doesn't exist
    - Set up storage policies for:
      - Public read access to images
      - Authenticated users can upload images
      - Authenticated users can update their own images
      - Authenticated users can delete their own images
  
  2. Security
    - Only authenticated users can upload/modify images
    - Public read access for all images
    - Users can only modify their own uploads
*/

-- Create the storage bucket if it doesn't exist
DO $$ 
BEGIN
  INSERT INTO storage.buckets (id, name)
  VALUES ('dog-images', 'dog-images')
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Public Access Dog Images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
END $$;

-- Allow public read access to images
CREATE POLICY "Public Access Dog Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'dog-images' );

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( 
  bucket_id = 'dog-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own images
CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( 
  bucket_id = 'dog-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK ( 
  bucket_id = 'dog-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING ( 
  bucket_id = 'dog-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);