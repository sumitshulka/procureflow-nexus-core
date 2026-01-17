-- Fix signup failure: during auth trigger execution auth.uid() is NULL, so security_logs.user_id must fall back
CREATE OR REPLACE FUNCTION public.log_role_assignment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  role_name_val TEXT;
  actor_user_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT name INTO role_name_val FROM public.custom_roles WHERE id = NEW.role_id;
    actor_user_id := COALESCE(auth.uid(), NEW.user_id);

    INSERT INTO public.security_logs (
      user_id,
      action,
      target_user_id,
      role_name,
      metadata
    ) VALUES (
      actor_user_id,
      'role_assigned',
      NEW.user_id,
      role_name_val,
      jsonb_build_object(
        'operation', 'INSERT',
        'role_id', NEW.role_id,
        'actor_source', CASE WHEN auth.uid() IS NULL THEN 'system' ELSE 'user' END
      )
    );

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT name INTO role_name_val FROM public.custom_roles WHERE id = OLD.role_id;
    actor_user_id := COALESCE(auth.uid(), OLD.user_id);

    INSERT INTO public.security_logs (
      user_id,
      action,
      target_user_id,
      role_name,
      metadata
    ) VALUES (
      actor_user_id,
      'role_removed',
      OLD.user_id,
      role_name_val,
      jsonb_build_object(
        'operation', 'DELETE',
        'role_id', OLD.role_id,
        'actor_source', CASE WHEN auth.uid() IS NULL THEN 'system' ELSE 'user' END
      )
    );

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$function$;