-- Create storage bucket for invoice documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-documents', 'invoice-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for invoice documents bucket
CREATE POLICY "Authenticated users can upload invoice documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'invoice-documents');

CREATE POLICY "Users can view invoice documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoice-documents' AND
  (
    -- Admins and procurement officers can view all
    has_role(auth.uid(), 'admin'::user_role) OR
    has_role(auth.uid(), 'procurement_officer'::user_role) OR
    -- Users can view invoices they created
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.invoice_pdf_url = storage.objects.name
      AND invoices.created_by = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete their own invoice documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'invoice-documents' AND
  EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.invoice_pdf_url = storage.objects.name
    AND invoices.created_by = auth.uid()
  )
);