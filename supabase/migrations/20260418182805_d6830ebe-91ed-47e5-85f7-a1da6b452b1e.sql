
-- Create public bucket for RFP supporting documents (PDFs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('rfp-attachments', 'rfp-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Public read so vendors (including unauthenticated public RFP viewers) can download
CREATE POLICY "RFP attachments are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'rfp-attachments');

-- Authenticated users (RFP creators) can upload
CREATE POLICY "Authenticated users can upload RFP attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'rfp-attachments');

-- Owners can update their files (folder convention: <user_id>/<filename>)
CREATE POLICY "Users can update their own RFP attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'rfp-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Owners can delete their files
CREATE POLICY "Users can delete their own RFP attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'rfp-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
