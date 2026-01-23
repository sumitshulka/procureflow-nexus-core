-- Update the UPDATE policy to allow managers to edit revision_requested budgets
DROP POLICY IF EXISTS "Users can update their own budget allocations" ON budget_allocations;

CREATE POLICY "Users can update their own budget allocations"
ON budget_allocations
FOR UPDATE
USING (
  (submitted_by = auth.uid()) AND 
  (status IN ('draft', 'submitted', 'revision_requested'))
)
WITH CHECK (
  (submitted_by = auth.uid()) AND 
  (status IN ('draft', 'submitted', 'revision_requested'))
);