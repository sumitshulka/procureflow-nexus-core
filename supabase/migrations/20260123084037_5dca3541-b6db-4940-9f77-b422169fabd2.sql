-- Drop the broken policy
DROP POLICY IF EXISTS "Users can add department sub-heads" ON public.budget_heads;

-- Create the corrected policy
CREATE POLICY "Users can add department sub-heads"
ON public.budget_heads
FOR INSERT
TO authenticated
WITH CHECK (
  -- Must be a subhead with a parent
  is_subhead = true 
  AND parent_id IS NOT NULL
  -- Parent must allow department subitems
  AND EXISTS (
    SELECT 1 FROM public.budget_heads AS parent
    WHERE parent.id = budget_heads.parent_id
    AND parent.allow_department_subitems = true
  )
);