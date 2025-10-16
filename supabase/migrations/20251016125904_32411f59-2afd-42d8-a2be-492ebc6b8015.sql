-- Add allowed_departments column to budget_cycles to control which departments can access the cycle
ALTER TABLE public.budget_cycles 
ADD COLUMN allowed_department_ids uuid[] DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.budget_cycles.allowed_department_ids IS 'Array of department IDs that can access this budget cycle. NULL or empty array means all departments can access.';

-- Update the RLS policy for department heads to check allowed departments
DROP POLICY IF EXISTS "Department heads can view open cycles" ON public.budget_cycles;

CREATE POLICY "Department heads can view open cycles"
ON public.budget_cycles
FOR SELECT
TO authenticated
USING (
  status = 'open' 
  AND has_role(auth.uid(), 'department_head'::user_role)
  AND (
    -- If allowed_department_ids is NULL or empty, all departments can access
    allowed_department_ids IS NULL 
    OR array_length(allowed_department_ids, 1) IS NULL
    -- If allowed_department_ids has values, check if user's department is in the list
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN departments d ON d.id::text = p.department
      WHERE p.id = auth.uid() 
      AND d.id = ANY(allowed_department_ids)
    )
  )
);