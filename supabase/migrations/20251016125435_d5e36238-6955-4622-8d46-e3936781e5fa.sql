-- Ensure budget_cycles RLS policies allow department heads to see open cycles
-- Drop existing policies if they exist to recreate them properly
DROP POLICY IF EXISTS "Admins can manage all budget cycles" ON public.budget_cycles;
DROP POLICY IF EXISTS "Department heads can view open cycles" ON public.budget_cycles;
DROP POLICY IF EXISTS "Users can view their active cycles" ON public.budget_cycles;

-- Admin can manage all budget cycles
CREATE POLICY "Admins can manage all budget cycles"
ON public.budget_cycles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- Department heads can view open cycles to submit budgets
CREATE POLICY "Department heads can view open cycles"
ON public.budget_cycles
FOR SELECT
TO authenticated
USING (
  status = 'open' 
  AND has_role(auth.uid(), 'department_head'::user_role)
);

-- All authenticated users can view their relevant cycles
CREATE POLICY "Users can view relevant cycles"
ON public.budget_cycles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::user_role)
  OR (status = 'open' AND has_role(auth.uid(), 'department_head'::user_role))
  OR (created_by = auth.uid())
);

-- Add helpful comment
COMMENT ON COLUMN public.budget_cycles.status IS 'Budget cycle status: draft (not visible to dept heads), open (dept heads can submit), closed (no new submissions), archived (historical)';
