-- Phase 1 Continued: Fix remaining critical RLS policies (corrected)

-- Enable RLS on rfp_responses table
ALTER TABLE public.rfp_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for rfp_responses
CREATE POLICY "Vendors can create their own responses" 
ON public.rfp_responses 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM vendor_registrations vr 
    WHERE vr.user_id = auth.uid() AND vr.id = vendor_id
  )
);

CREATE POLICY "Vendors can view and update their own responses" 
ON public.rfp_responses 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM vendor_registrations vr 
    WHERE vr.user_id = auth.uid() AND vr.id = vendor_id
  )
);

CREATE POLICY "Organization can view all responses" 
ON public.rfp_responses 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'procurement_officer'::user_role)
);

-- Enable RLS on rfp_response_items table  
ALTER TABLE public.rfp_response_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for rfp_response_items (using correct column name)
CREATE POLICY "Vendors can manage items for their responses" 
ON public.rfp_response_items 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM rfp_responses rr
    JOIN vendor_registrations vr ON vr.id = rr.vendor_id
    WHERE rr.id = rfp_response_items.rfp_response_id 
    AND vr.user_id = auth.uid()
  )
);

CREATE POLICY "Organization can view all response items" 
ON public.rfp_response_items 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'procurement_officer'::user_role)
);

-- Enable RLS on custom_roles table
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_roles
CREATE POLICY "Admins can manage custom roles" 
ON public.custom_roles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can view active custom roles" 
ON public.custom_roles 
FOR SELECT 
USING (is_active = true);

-- Enable RLS on system_modules table
ALTER TABLE public.system_modules ENABLE ROW LEVEL SECURITY;

-- RLS policies for system_modules
CREATE POLICY "Admins can manage system modules" 
ON public.system_modules 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can view active system modules" 
ON public.system_modules 
FOR SELECT 
USING (is_active = true);

-- Enable RLS on role_permissions table
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for role_permissions
CREATE POLICY "Admins can manage role permissions" 
ON public.role_permissions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can view role permissions" 
ON public.role_permissions 
FOR SELECT 
USING (true);

-- Phase 2: Create secure function to prevent privilege escalation
CREATE OR REPLACE FUNCTION public.can_assign_role(target_user_id uuid, role_to_assign user_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Phase 3: Create security audit table for tracking sensitive operations
CREATE TABLE IF NOT EXISTS public.security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  role_name text,
  ip_address text,
  user_agent text,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on security_logs
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for security_logs
CREATE POLICY "Admins can view all security logs" 
ON public.security_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "System can insert security logs" 
ON public.security_logs 
FOR INSERT 
WITH CHECK (true);

-- Phase 4: Create trigger for role assignment auditing
CREATE OR REPLACE FUNCTION public.log_role_assignment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Create trigger for user_roles table
DROP TRIGGER IF EXISTS audit_role_changes ON public.user_roles;
CREATE TRIGGER audit_role_changes
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_assignment_changes();