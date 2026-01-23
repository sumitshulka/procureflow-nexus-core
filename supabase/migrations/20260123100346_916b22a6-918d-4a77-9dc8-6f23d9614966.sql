-- Drop the existing restrictive update policy
DROP POLICY IF EXISTS "Users can update their own draft allocations" ON public.budget_allocations;

-- Create a new policy that allows users to update their own draft allocations
-- and also allows changing status from draft to submitted
CREATE POLICY "Users can update their own draft allocations" 
ON public.budget_allocations 
FOR UPDATE 
USING (
  (submitted_by = auth.uid() AND status = 'draft'::budget_allocation_status)
)
WITH CHECK (
  submitted_by = auth.uid() 
  AND status IN ('draft'::budget_allocation_status, 'submitted'::budget_allocation_status)
);