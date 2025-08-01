-- PHASE 1: CRITICAL DATABASE SECURITY FIXES

-- Fix 1: Enable RLS on tables that have policies but RLS disabled
ALTER TABLE public.rfps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfp_evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_hierarchies ENABLE ROW LEVEL SECURITY;

-- Fix 2: Secure all database functions by adding SET search_path = 'public'
-- This prevents SQL injection attacks through search_path manipulation

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

CREATE OR REPLACE FUNCTION public.get_effective_rfp_data(p_rfp_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.log_rfp_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_rfp_activity(
      NEW.id,
      'created',
      NEW.created_by,
      'RFP Created',
      'RFP ' || NEW.rfp_number || ' was created',
      jsonb_build_object('rfp_number', NEW.rfp_number)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'published' THEN
    PERFORM public.log_rfp_activity(
      NEW.id,
      'published',
      NEW.created_by,
      'RFP Published',
      'RFP ' || NEW.rfp_number || ' was published',
      jsonb_build_object('rfp_number', NEW.rfp_number)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_addendum_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  rfp_number TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT r.rfp_number INTO rfp_number
    FROM public.rfps r
    WHERE r.id = NEW.rfp_id;
    
    PERFORM public.log_rfp_activity(
      NEW.rfp_id,
      'addendum_added',
      NEW.created_by,
      'Addendum #' || NEW.addendum_number || ' Added',
      'Addendum #' || NEW.addendum_number || ' was added to RFP ' || rfp_number,
      jsonb_build_object(
        'addendum_number', NEW.addendum_number,
        'addendum_title', NEW.title,
        'field_overrides', NEW.field_overrides
      )
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.is_published = false AND NEW.is_published = true THEN
    SELECT r.rfp_number INTO rfp_number
    FROM public.rfps r
    WHERE r.id = NEW.rfp_id;
    
    PERFORM public.log_rfp_activity(
      NEW.rfp_id,
      'addendum_published',
      NEW.created_by,
      'Addendum #' || NEW.addendum_number || ' Published',
      'Addendum #' || NEW.addendum_number || ' was published for RFP ' || rfp_number,
      jsonb_build_object(
        'addendum_number', NEW.addendum_number,
        'addendum_title', NEW.title
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix 3: Strengthen password policy function
CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  result jsonb := '{"valid": true, "errors": []}'::jsonb;
  errors text[] := '{}';
BEGIN
  -- Check minimum length (12 characters)
  IF length(password) < 12 THEN
    errors := array_append(errors, 'Password must be at least 12 characters long');
  END IF;
  
  -- Check for uppercase letter
  IF password !~ '[A-Z]' THEN
    errors := array_append(errors, 'Password must contain at least one uppercase letter');
  END IF;
  
  -- Check for lowercase letter
  IF password !~ '[a-z]' THEN
    errors := array_append(errors, 'Password must contain at least one lowercase letter');
  END IF;
  
  -- Check for number
  IF password !~ '[0-9]' THEN
    errors := array_append(errors, 'Password must contain at least one number');
  END IF;
  
  -- Check for special character
  IF password !~ '[!@#$%^&*()_+\-=\[\]{};'':"\\|,.<>\?]' THEN
    errors := array_append(errors, 'Password must contain at least one special character');
  END IF;
  
  -- Check for common patterns
  IF password ~* '.*(password|123456|qwerty|admin|root).*' THEN
    errors := array_append(errors, 'Password contains common weak patterns');
  END IF;
  
  -- Update result
  IF array_length(errors, 1) > 0 THEN
    result := jsonb_build_object(
      'valid', false,
      'errors', to_jsonb(errors)
    );
  END IF;
  
  RETURN result;
END;
$function$;

-- Fix 4: Create secure audit logging for authentication events
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  success boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs" ON public.security_audit_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role));

-- Fix 5: Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id uuid,
  p_event_type text,
  p_event_data jsonb DEFAULT '{}',
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_success boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.security_audit_logs (
    user_id,
    event_type,
    event_data,
    ip_address,
    user_agent,
    success
  ) VALUES (
    p_user_id,
    p_event_type,
    p_event_data,
    p_ip_address,
    p_user_agent,
    p_success
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$function$;

-- Fix 6: Create password history tracking
CREATE TABLE IF NOT EXISTS public.password_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  password_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own password history" ON public.password_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Only system can insert password history" ON public.password_history
  FOR INSERT WITH CHECK (false); -- Only allow through functions

-- Fix 7: Create function to check password history
CREATE OR REPLACE FUNCTION public.check_password_history(
  p_user_id uuid,
  p_new_password_hash text,
  p_history_count integer DEFAULT 5
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Check if the new password hash matches any of the last N passwords
  RETURN NOT EXISTS (
    SELECT 1 
    FROM public.password_history 
    WHERE user_id = p_user_id 
    AND password_hash = p_new_password_hash
    ORDER BY created_at DESC 
    LIMIT p_history_count
  );
END;
$function$;