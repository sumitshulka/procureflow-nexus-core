-- Create storage bucket for invoice PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-pdfs', 'invoice-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow vendors to upload their own invoice PDFs
CREATE POLICY "Vendors can upload their own invoice PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoice-pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow vendors to view their own invoice PDFs
CREATE POLICY "Vendors can view their own invoice PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoice-pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow anyone to view invoice PDFs (public bucket)
CREATE POLICY "Public invoice PDFs are viewable by all"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'invoice-pdfs');