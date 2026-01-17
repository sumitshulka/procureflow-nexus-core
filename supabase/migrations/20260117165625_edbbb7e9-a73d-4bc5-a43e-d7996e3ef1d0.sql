-- Drop the existing policies
DROP POLICY IF EXISTS "Admins can manage role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Users can view role permissions" ON public.role_permissions;

-- Create proper RLS policies with correct WITH CHECK clauses

-- Allow everyone to view role permissions
CREATE POLICY "Anyone can view role permissions"
ON public.role_permissions
FOR SELECT
USING (true);

-- Allow admins to insert role permissions
CREATE POLICY "Admins can insert role permissions"
ON public.role_permissions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Allow admins to update role permissions
CREATE POLICY "Admins can update role permissions"
ON public.role_permissions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Allow admins to delete role permissions
CREATE POLICY "Admins can delete role permissions"
ON public.role_permissions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::user_role));