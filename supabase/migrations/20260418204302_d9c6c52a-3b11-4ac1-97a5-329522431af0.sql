-- Update risk_assessments status check constraint to allow ISO 31000 lifecycle statuses
ALTER TABLE public.risk_assessments DROP CONSTRAINT IF EXISTS risk_assessments_status_check;

ALTER TABLE public.risk_assessments
  ADD CONSTRAINT risk_assessments_status_check
  CHECK (status = ANY (ARRAY[
    'Open'::text,
    'Mitigating'::text,
    'Monitoring'::text,
    'Mitigated'::text,
    'Accepted'::text,
    'Closed'::text,
    'Escalated'::text,
    'Under Review'::text,
    'Active'::text
  ]));