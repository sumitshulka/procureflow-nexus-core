-- Add is_deleted column for soft delete (retains all references)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

-- Add deleted_at and deleted_by for audit trail
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id);

-- Add deactivated_at and deactivated_by for audit trail
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS deactivated_at timestamp with time zone;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS deactivated_by uuid REFERENCES auth.users(id);

-- Create a function to check if a user can login (not deleted and active)
CREATE OR REPLACE FUNCTION public.can_user_login(p_user_id uuid)
RETURNS TABLE (can_login boolean, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_is_deleted boolean;
BEGIN
  SELECT status, is_deleted INTO v_status, v_is_deleted
  FROM profiles
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'User profile not found'::text;
    RETURN;
  END IF;
  
  IF v_is_deleted THEN
    RETURN QUERY SELECT false, 'Your account has been deleted. Please contact your administrator.'::text;
    RETURN;
  END IF;
  
  IF v_status = 'inactive' THEN
    RETURN QUERY SELECT false, 'Your account has been deactivated. Please contact your administrator.'::text;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- Create index for faster queries on active users
CREATE INDEX IF NOT EXISTS idx_profiles_status_deleted ON public.profiles(status, is_deleted);

-- Grant execute on the function
GRANT EXECUTE ON FUNCTION public.can_user_login(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_login(uuid) TO anon;