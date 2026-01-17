-- Update the handle_new_user trigger function to use role_id instead of role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  default_role_id UUID;
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Get the 'requester' role id (or create one if it doesn't exist)
  SELECT id INTO default_role_id 
  FROM public.custom_roles 
  WHERE LOWER(name) = 'requester' 
  LIMIT 1;
  
  -- If requester role doesn't exist, try 'user' role
  IF default_role_id IS NULL THEN
    SELECT id INTO default_role_id 
    FROM public.custom_roles 
    WHERE LOWER(name) = 'user' 
    LIMIT 1;
  END IF;
  
  -- Assign default role for new users (only if a role was found)
  IF default_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (NEW.id, default_role_id);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Also update the log_role_assignment_changes function to use role_id
CREATE OR REPLACE FUNCTION public.log_role_assignment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  role_name_val TEXT;
BEGIN
  -- Get role name from custom_roles
  IF TG_OP = 'INSERT' THEN
    SELECT name INTO role_name_val FROM public.custom_roles WHERE id = NEW.role_id;
    
    INSERT INTO public.security_logs (
      user_id,
      action,
      target_user_id,
      role_name,
      metadata
    ) VALUES (
      auth.uid(),
      'role_assigned',
      NEW.user_id,
      role_name_val,
      jsonb_build_object('operation', 'INSERT', 'role_id', NEW.role_id)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT name INTO role_name_val FROM public.custom_roles WHERE id = OLD.role_id;
    
    INSERT INTO public.security_logs (
      user_id,
      action,
      target_user_id,
      role_name,
      metadata
    ) VALUES (
      auth.uid(),
      'role_removed',
      OLD.user_id,
      role_name_val,
      jsonb_build_object('operation', 'DELETE', 'role_id', OLD.role_id)
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$;