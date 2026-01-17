-- Update the has_role function to use the new role_id/custom_roles structure
-- This maintains backward compatibility with existing RLS policies that use the user_role enum
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, required_role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.custom_roles cr ON ur.role_id = cr.id
    WHERE ur.user_id = $1
      AND LOWER(cr.name) = LOWER($2::text)
  );
$$;