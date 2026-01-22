-- Remove recursive/duplicate RLS policies that still reference user_department_assignments inside their USING clause
DROP POLICY IF EXISTS "Department heads can view department assignments" ON public.user_department_assignments;
DROP POLICY IF EXISTS "Admins can manage department assignments" ON public.user_department_assignments;
DROP POLICY IF EXISTS "Users can view own department assignments" ON public.user_department_assignments;
DROP POLICY IF EXISTS "Users can view own assignments" ON public.user_department_assignments;
DROP POLICY IF EXISTS "Admins can manage all department assignments" ON public.user_department_assignments;
DROP POLICY IF EXISTS "Department heads can view dept assignments" ON public.user_department_assignments;

-- Recreate a clean, non-recursive policy set
CREATE POLICY "Admins manage department assignments"
ON public.user_department_assignments
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Users view own department assignments"
ON public.user_department_assignments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Dept heads view assignments in their department"
ON public.user_department_assignments
FOR SELECT
TO authenticated
USING (public.is_department_head_of(department_id));