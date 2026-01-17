-- Fix the can_access_invoice_as_staff function to use correct column names
-- The user_roles table has role_id (UUID) that references custom_roles, not a 'role' text column

CREATE OR REPLACE FUNCTION public.can_access_invoice_as_staff(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN custom_roles cr ON ur.role_id = cr.id
    WHERE ur.user_id = p_user_id
    AND cr.name IN ('Admin', 'Finance Officer', 'System Administrator')
  );
$$;