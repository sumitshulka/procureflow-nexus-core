-- Phase 2: Create only missing RLS policies

-- 1. Create secure RLS policies for purchase_orders (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'purchase_orders' 
        AND policyname = 'Admin and procurement officers can manage purchase orders'
    ) THEN
        CREATE POLICY "Admin and procurement officers can manage purchase orders"
        ON public.purchase_orders FOR ALL
        USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'procurement_officer'::user_role));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'purchase_orders' 
        AND policyname = 'Vendors can view their own purchase orders'
    ) THEN
        CREATE POLICY "Vendors can view their own purchase orders"
        ON public.purchase_orders FOR SELECT
        USING (EXISTS (
          SELECT 1 FROM vendor_registrations vr 
          WHERE vr.id = purchase_orders.vendor_id AND vr.user_id = auth.uid()
        ));
    END IF;
END $$;

-- 2. Create secure RLS policies for purchase_order_items (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'purchase_order_items' 
        AND policyname = 'Admin and procurement officers can manage PO items'
    ) THEN
        CREATE POLICY "Admin and procurement officers can manage PO items"
        ON public.purchase_order_items FOR ALL
        USING (EXISTS (
          SELECT 1 FROM purchase_orders po 
          WHERE po.id = purchase_order_items.po_id 
          AND (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'procurement_officer'::user_role))
        ));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'purchase_order_items' 
        AND policyname = 'Vendors can view their own PO items'
    ) THEN
        CREATE POLICY "Vendors can view their own PO items"
        ON public.purchase_order_items FOR SELECT
        USING (EXISTS (
          SELECT 1 FROM purchase_orders po
          JOIN vendor_registrations vr ON vr.id = po.vendor_id
          WHERE po.id = purchase_order_items.po_id AND vr.user_id = auth.uid()
        ));
    END IF;
END $$;

-- 3. Create role assignment security function
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

-- 4. Create role change auditing function and trigger
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

-- Create trigger for user_roles table (drop first if exists)
DROP TRIGGER IF EXISTS role_assignment_audit_trigger ON public.user_roles;
CREATE TRIGGER role_assignment_audit_trigger
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_assignment_changes();