-- Drop the problematic RLS policies
DROP POLICY IF EXISTS "Admins can manage all department assignments" ON public.user_department_assignments;
DROP POLICY IF EXISTS "Users can view their own department assignments" ON public.user_department_assignments;
DROP POLICY IF EXISTS "Department heads can view assignments in their departments" ON public.user_department_assignments;

-- Create a security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN custom_roles cr ON ur.role_id = cr.id
    WHERE ur.user_id = auth.uid()
    AND LOWER(cr.name) IN ('admin', 'administrator', 'system admin')
  );
$$;

-- Create a security definer function to check department head access
CREATE OR REPLACE FUNCTION public.is_department_head_of(p_department_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    JOIN custom_roles cr ON ur.role_id = cr.id
    WHERE p.id = auth.uid()
    AND p.department_id = p_department_id
    AND LOWER(cr.name) IN ('manager', 'department head', 'director')
  );
$$;

-- Recreate simpler, non-recursive RLS policies
-- Policy for admins to do everything (uses security definer function)
CREATE POLICY "Admins can manage all department assignments"
ON public.user_department_assignments
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Policy for users to view their own assignments
CREATE POLICY "Users can view own department assignments"
ON public.user_department_assignments
FOR SELECT
USING (user_id = auth.uid());

-- Policy for department heads to view assignments in their departments
CREATE POLICY "Department heads can view dept assignments"
ON public.user_department_assignments
FOR SELECT
USING (public.is_department_head_of(department_id));