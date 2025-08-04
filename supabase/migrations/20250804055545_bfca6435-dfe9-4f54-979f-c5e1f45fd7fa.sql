-- Critical Security Fix 1: Fix remaining function search paths
-- Add SET search_path = 'public' to remaining functions that need it

CREATE OR REPLACE FUNCTION public.generate_addendum_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    next_number INTEGER;
BEGIN
    -- Get the next addendum number for this RFP
    SELECT COALESCE(MAX(addendum_number), 0) + 1 
    INTO next_number
    FROM public.rfp_addendums 
    WHERE rfp_id = NEW.rfp_id;
    
    NEW.addendum_number := next_number;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_rfp_communication_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_assign_role(target_user_id uuid, role_to_assign user_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only admins can assign roles
  IF NOT has_role(auth.uid(), 'admin'::user_role) THEN
    RETURN false;
  END IF;
  
  -- Prevent assigning admin role unless current user is admin
  IF role_to_assign = 'admin'::user_role THEN
    RETURN has_role(auth.uid(), 'admin'::user_role);
  END IF;
  
  -- All other roles can be assigned by admins
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_role_assignment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Log role assignments
  IF TG_OP = 'INSERT' THEN
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
      NEW.role::text,
      jsonb_build_object('operation', 'INSERT', 'role_id', NEW.role)
    );
  ELSIF TG_OP = 'DELETE' THEN
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
      OLD.role::text,
      jsonb_build_object('operation', 'DELETE', 'role_id', OLD.role)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_effective_rfp_data(p_rfp_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  base_rfp JSONB;
  addendum_overrides JSONB := '{}';
  addendum_record RECORD;
BEGIN
  -- Get base RFP data
  SELECT to_jsonb(rfps) INTO base_rfp
  FROM public.rfps
  WHERE id = p_rfp_id;
  
  IF base_rfp IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Apply addendum overrides in chronological order
  FOR addendum_record IN
    SELECT field_overrides, addendum_number
    FROM public.rfp_addendums
    WHERE rfp_id = p_rfp_id 
    AND is_published = true
    ORDER BY addendum_number ASC
  LOOP
    -- Merge field overrides
    addendum_overrides := addendum_overrides || addendum_record.field_overrides;
  END LOOP;
  
  -- Merge base RFP with all addendum overrides
  RETURN base_rfp || addendum_overrides;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_rfp_activity(p_rfp_id uuid, p_activity_type text, p_performed_by uuid, p_title text, p_description text DEFAULT NULL::text, p_activity_data jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO public.rfp_activities (
    rfp_id,
    activity_type,
    performed_by,
    title,
    description,
    activity_data
  ) VALUES (
    p_rfp_id,
    p_activity_type,
    p_performed_by,
    p_title,
    p_description,
    p_activity_data
  ) RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$function$;

-- Fix auth.users exposure by creating secure admin functions
-- Remove the exposed views and create properly secured Edge Functions instead
-- This will be handled by creating Edge Functions in the next step