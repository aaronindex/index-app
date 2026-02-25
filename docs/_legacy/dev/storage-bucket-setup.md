# Supabase Storage Bucket Setup: project-assets

This document describes how to set up the `project-assets` storage bucket in Supabase for the Library feature.

## Bucket Configuration

### 1. Create the Bucket

1. Go to Supabase Dashboard > Storage
2. Click "New bucket"
3. Name: `project-assets`
4. Public: **No** (private bucket)
5. File size limit: 20 MB (or your preferred limit)
6. Allowed MIME types: 
   - `application/pdf`
   - `image/png`
   - `image/jpeg`
   - `image/jpg`
   - `image/webp`

### 2. Storage Policies (RLS)

The bucket should have the following RLS policies:

#### Policy: Users can upload to their own folder
```sql
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy: Users can view their own files
```sql
CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy: Users can delete their own files
```sql
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 3. Folder Structure

Files are stored with the following path structure:
```
{user_id}/{project_id}/{asset_id}-{random}.{ext}
```

Example:
```
a1b2c3d4-e5f6-7890-abcd-ef1234567890/
  550e8400-e29b-41d4-a716-446655440000/
    1234567890-abc123.pdf
```

### 4. File Validation

The API route (`/api/assets/create`) validates:
- File type (PDF, PNG, JPG, JPEG, WEBP only)
- File size (20MB max)
- User ownership (via RLS)

### 5. Signed URLs

For file downloads, the API generates signed URLs with 1-hour expiry:
- Route: `/api/assets/[id]/download`
- Uses `supabase.storage.createSignedUrl()`

## Testing

After setup, test:
1. Upload a PDF file
2. Upload an image (PNG/JPG)
3. Verify file appears in Library tab
4. Click "View" to download/open file
5. Verify RLS prevents access to other users' files

