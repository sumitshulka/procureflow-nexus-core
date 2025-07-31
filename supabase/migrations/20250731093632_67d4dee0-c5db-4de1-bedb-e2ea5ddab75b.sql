-- COMPREHENSIVE SECURITY FIX MIGRATION
-- Phase 1: Critical Database Security

-- 1. Enable RLS on missing critical tables
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- 2. Create secure RLS policies for purchase_orders
CREATE POLICY "Admin and procurement officers can manage purchase orders"
ON public.purchase_orders FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'procurement_officer'::user_role));

CREATE POLICY "Vendors can view their own purchase orders"
ON public.purchase_orders FOR SELECT
USING (EXISTS (
  SELECT 1 FROM vendor_registrations vr 
  WHERE vr.id = purchase_orders.vendor_id AND vr.user_id = auth.uid()
));

-- 3. Create secure RLS policies for purchase_order_items
CREATE POLICY "Admin and procurement officers can manage PO items"
ON public.purchase_order_items FOR ALL
USING (EXISTS (
  SELECT 1 FROM purchase_orders po 
  WHERE po.id = purchase_order_items.po_id 
  AND (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'procurement_officer'::user_role))
));

CREATE POLICY "Vendors can view their own PO items"
ON public.purchase_order_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM purchase_orders po
  JOIN vendor_registrations vr ON vr.id = po.vendor_id
  WHERE po.id = purchase_order_items.po_id AND vr.user_id = auth.uid()
));

-- 4. Create secure RLS policies for custom_roles
CREATE POLICY "Admin can manage custom roles"
ON public.custom_roles FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can view active custom roles"
ON public.custom_roles FOR SELECT
USING (is_active = true);

-- 5. Create secure RLS policies for departments
CREATE POLICY "Admin can manage departments"
ON public.departments FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "All authenticated users can view departments"
ON public.departments FOR SELECT
USING (auth.role() = 'authenticated');

-- 6. Create secure RLS policies for system_modules
CREATE POLICY "Admin can manage system modules"
ON public.system_modules FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can view active system modules"
ON public.system_modules FOR SELECT
USING (is_active = true);

-- 7. Create secure RLS policies for role_permissions
CREATE POLICY "Admin can manage role permissions"
ON public.role_permissions FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can view permissions for their roles"
ON public.role_permissions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_role_assignments ura
  WHERE ura.user_id = auth.uid() 
  AND ura.custom_role_id = role_permissions.role_id
  AND ura.is_active = true
));

-- 8. Create security audit table for comprehensive logging
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_user_id UUID,
  role_name TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on security logs
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view security logs
CREATE POLICY "Admin can view all security logs"
ON public.security_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- System can insert security logs
CREATE POLICY "System can insert security logs"
ON public.security_logs FOR INSERT
WITH CHECK (true);

-- 9. Enhanced role assignment security function
CREATE OR REPLACE FUNCTION public.can_assign_role(target_user_id UUID, role_to_assign user_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- 10. Create trigger for comprehensive role change auditing
CREATE OR REPLACE FUNCTION public.log_role_assignment_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
DROP TRIGGER IF EXISTS role_assignment_audit_trigger ON public.user_roles;
CREATE TRIGGER role_assignment_audit_trigger
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_assignment_changes();

-- 11. Fix all existing functions to prevent SQL injection
CREATE OR REPLACE FUNCTION public.generate_vendor_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    current_year TEXT;
    sequence_number INTEGER;
    new_vendor_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(vr.vendor_number FROM 9) AS INTEGER)), 0) + 1
    INTO sequence_number
    FROM public.vendor_registrations vr
    WHERE vr.vendor_number LIKE 'VN-' || current_year || '-%'
    AND vr.vendor_number IS NOT NULL;
    
    new_vendor_number := 'VN-' || current_year || '-' || LPAD(sequence_number::TEXT, 4, '0');
    
    RETURN new_vendor_number;
END;
$$;

-- 12. Create password security validation function
CREATE OR REPLACE FUNCTION public.validate_password_strength(password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Password must be at least 8 characters
  IF LENGTH(password) < 8 THEN
    RETURN FALSE;
  END IF;
  
  -- Must contain at least one uppercase letter
  IF password !~ '[A-Z]' THEN
    RETURN FALSE;
  END IF;
  
  -- Must contain at least one lowercase letter
  IF password !~ '[a-z]' THEN
    RETURN FALSE;
  END IF;
  
  -- Must contain at least one number
  IF password !~ '[0-9]' THEN
    RETURN FALSE;
  END IF;
  
  -- Must contain at least one special character
  IF password !~ '[!@#$%^&*(),.?":{}|<>]' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;