-- Allow 'info_requested' status in PO approval history
ALTER TABLE public.po_approval_history DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE public.po_approval_history ADD CONSTRAINT valid_status
  CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'info_requested'::text]));