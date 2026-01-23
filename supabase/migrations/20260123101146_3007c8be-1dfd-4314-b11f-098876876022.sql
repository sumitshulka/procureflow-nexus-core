-- Update RLS policy to allow revoking submissions (changing status from submitted back to draft)
DROP POLICY IF EXISTS "Users can update their own draft allocations" ON public.budget_allocations;

CREATE POLICY "Users can update their own budget allocations" 
ON public.budget_allocations 
FOR UPDATE 
USING (
  submitted_by = auth.uid() 
  AND status IN ('draft'::budget_allocation_status, 'submitted'::budget_allocation_status)
)
WITH CHECK (
  submitted_by = auth.uid() 
  AND status IN ('draft'::budget_allocation_status, 'submitted'::budget_allocation_status)
);