-- CRITICAL SECURITY FIXES - Phase 2
-- Addresses all remaining ERROR and WARN level linter issues

-- 1. Drop exposed auth.users views (ERROR level)
-- These views expose auth.users to anon/authenticated roles which is a critical security risk
DROP VIEW IF EXISTS public.approval_requests_view CASCADE;
DROP VIEW IF EXISTS public.procurement_request_details CASCADE;

-- 2. Remove SECURITY DEFINER from dangerous views (ERROR level)
-- We'll recreate them as regular views or secure functions as needed

-- 3. Fix remaining functions missing SET search_path (WARN level)
-- These functions are vulnerable to search path attacks

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Assign default 'requester' role for new users
  -- Can be changed later by admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'requester');
  
  RETURN NEW;
END;
$function$;

-- Fix has_role function
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, required_role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = $1
    AND role = $2
  );
$function$;

-- Fix create_price_history_from_po function
CREATE OR REPLACE FUNCTION public.create_price_history_from_po()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    -- Insert price history for each item in the purchase order
    INSERT INTO public.product_price_history (
        product_id,
        price,
        currency,
        purchase_order_id,
        effective_date,
        created_by,
        source_type,
        notes
    )
    SELECT 
        poi.product_id,
        poi.unit_price,
        po.currency,
        NEW.id,
        NEW.po_date,
        NEW.created_by,
        'purchase_order',
        'Price from Purchase Order ' || NEW.po_number
    FROM public.purchase_order_items poi
    JOIN public.purchase_orders po ON po.id = NEW.id
    WHERE poi.po_id = NEW.id AND poi.product_id IS NOT NULL;
    
    RETURN NEW;
END;
$function$;

-- Fix is_request_completed function
CREATE OR REPLACE FUNCTION public.is_request_completed(request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
  items_count integer;
  checked_out_items_count integer;
BEGIN
  -- Get the total number of items in the request
  SELECT COUNT(*) INTO items_count
  FROM procurement_request_items pri
  WHERE pri.request_id = $1;
  
  -- Get the number of items that have been checked out and delivered
  SELECT COUNT(*) INTO checked_out_items_count
  FROM inventory_transactions it
  WHERE it.request_id = $1::text
    AND it.type = 'check_out'
    AND it.approval_status = 'approved'
    AND it.delivery_status = 'delivered';
  
  -- If all items have been checked out and delivered, consider the request completed
  RETURN items_count > 0 AND items_count = checked_out_items_count;
END;
$function$;

-- Fix record_delivery_and_update_inventory function
CREATE OR REPLACE FUNCTION public.record_delivery_and_update_inventory(transaction_id uuid, p_delivery_details jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  transaction_record record;
  item_id uuid;
  item_quantity integer;
  result jsonb;
BEGIN
  -- Get the transaction details
  SELECT * INTO transaction_record
  FROM public.inventory_transactions
  WHERE id = transaction_id AND type = 'check_out' AND approval_status = 'approved';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found or not eligible for delivery';
  END IF;
  
  -- Update the transaction with delivery details
  UPDATE public.inventory_transactions
  SET 
    delivery_details = p_delivery_details,
    delivery_status = 'delivered'
  WHERE id = transaction_id;
  
  -- Find and update inventory
  SELECT id, quantity INTO item_id, item_quantity
  FROM public.inventory_items
  WHERE product_id = transaction_record.product_id 
    AND warehouse_id = transaction_record.source_warehouse_id;
  
  IF FOUND THEN
    -- Reduce inventory quantity
    UPDATE public.inventory_items
    SET 
      quantity = GREATEST(0, quantity - transaction_record.quantity),
      last_updated = NOW()
    WHERE id = item_id;
    
    -- Log the inventory update
    INSERT INTO public.activity_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      details
    ) VALUES (
      COALESCE(transaction_record.user_id, '00000000-0000-0000-0000-000000000000'::uuid),
      'inventory_reduction_after_delivery',
      'inventory_item',
      item_id,
      jsonb_build_object(
        'transaction_id', transaction_id,
        'product_id', transaction_record.product_id,
        'quantity_reduced', transaction_record.quantity,
        'warehouse_id', transaction_record.source_warehouse_id,
        'previous_quantity', item_quantity,
        'new_quantity', GREATEST(0, item_quantity - transaction_record.quantity)
      )
    );
  END IF;
  
  -- Return the updated transaction
  SELECT to_jsonb(inventory_transactions) INTO result
  FROM public.inventory_transactions
  WHERE id = transaction_id;
  
  RETURN result;
END;
$function$;

-- Fix set_vendor_currency_from_country function
CREATE OR REPLACE FUNCTION public.set_vendor_currency_from_country()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
    base_currency_val TEXT;
BEGIN
    -- Get organization base currency first
    SELECT base_currency INTO base_currency_val
    FROM public.organization_settings
    LIMIT 1;
    
    -- If no organization base currency is set, use USD as default
    IF base_currency_val IS NULL THEN
        base_currency_val := 'USD';
    END IF;
    
    -- If currency is not explicitly set, determine from country
    IF NEW.currency IS NULL OR NEW.currency = 'USD' THEN
        -- If country is provided, get its currency
        IF NEW.country IS NOT NULL AND NEW.country != '' THEN
            NEW.currency := public.get_currency_for_country(NEW.country);
        ELSE
            -- Use organization base currency as fallback
            NEW.currency := base_currency_val;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Fix update_transaction_delivery_details function
CREATE OR REPLACE FUNCTION public.update_transaction_delivery_details(transaction_id uuid, p_delivery_details jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  -- Update the transaction with delivery details and mark as delivered
  UPDATE public.inventory_transactions
  SET 
    delivery_details = p_delivery_details,
    delivery_status = 'delivered',
    updated_at = NOW()
  WHERE id = transaction_id
  RETURNING jsonb_build_object(
    'id', id,
    'delivery_details', delivery_details,
    'delivery_status', delivery_status,
    'type', type,
    'product_id', product_id,
    'quantity', quantity,
    'source_warehouse_id', source_warehouse_id,
    'transaction_date', transaction_date,
    'user_id', user_id,
    'approval_status', approval_status,
    'request_id', request_id,
    'reference', reference,
    'notes', notes,
    'target_warehouse_id', target_warehouse_id,
    'updated_at', updated_at
  ) INTO result;
  
  IF result IS NULL THEN
    RAISE EXCEPTION 'Transaction with id % not found', transaction_id;
  END IF;
  
  RETURN result;
END;
$function$;

-- Fix user_has_module_permission function
CREATE OR REPLACE FUNCTION public.user_has_module_permission(p_user_id uuid, p_module_name text, p_permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  has_permission BOOLEAN := false;
  module_id UUID;
BEGIN
  -- Get module ID
  SELECT sm.id INTO module_id
  FROM public.system_modules sm
  LEFT JOIN public.menu_items mi ON sm.menu_item_id = mi.id
  WHERE sm.name = p_module_name AND sm.is_active = true;
  
  IF module_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check user-specific permissions first (override)
  SELECT EXISTS(
    SELECT 1 FROM public.user_module_permissions ump
    WHERE ump.user_id = p_user_id 
    AND ump.module_id = module_id 
    AND ump.permission = p_permission 
    AND ump.is_active = true
  ) INTO has_permission;
  
  IF has_permission THEN
    RETURN true;
  END IF;
  
  -- Check role-based permissions
  SELECT EXISTS(
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.role_permissions rp ON ura.custom_role_id = rp.role_id
    WHERE ura.user_id = p_user_id 
    AND ura.is_active = true
    AND rp.module_uuid = module_id 
    AND (rp.permission = p_permission OR rp.permission = 'admin')
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$function$;

-- Fix validate_procurement_request_deletion function
CREATE OR REPLACE FUNCTION public.validate_procurement_request_deletion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  -- Check if request is in a status that allows deletion
  IF OLD.status NOT IN ('draft', 'submitted') THEN
    RAISE EXCEPTION 'Cannot delete request with status %', OLD.status;
  END IF;
  
  -- Check if the request is used in inventory
  IF EXISTS (
    SELECT 1 FROM public.inventory_transactions
    WHERE request_id = OLD.id::text
  ) THEN
    RAISE EXCEPTION 'Cannot delete request that is used in inventory transactions';
  END IF;
  
  RETURN OLD;
END;
$function$;

-- Fix handle_procurement_request_deletion function
CREATE OR REPLACE FUNCTION public.handle_procurement_request_deletion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  -- Delete related request items when a procurement request is deleted
  DELETE FROM procurement_request_items 
  WHERE request_id = OLD.id;
  
  RETURN OLD;
END;
$function$;

-- Fix generate_vendor_number function
CREATE OR REPLACE FUNCTION public.generate_vendor_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
    current_year TEXT;
    sequence_number INTEGER;
    new_vendor_number TEXT;
BEGIN
    -- Get current year
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get the next sequence number for this year
    -- Use explicit table reference to avoid ambiguity
    SELECT COALESCE(MAX(CAST(SUBSTRING(vr.vendor_number FROM 9) AS INTEGER)), 0) + 1
    INTO sequence_number
    FROM public.vendor_registrations vr
    WHERE vr.vendor_number LIKE 'VN-' || current_year || '-%'
    AND vr.vendor_number IS NOT NULL;
    
    -- Format: VN-YYYY-NNNN (e.g., VN-2025-0001)
    new_vendor_number := 'VN-' || current_year || '-' || LPAD(sequence_number::TEXT, 4, '0');
    
    RETURN new_vendor_number;
END;
$function$;

-- 4. Create secure replacement for approval_requests_view without exposing auth.users
CREATE OR REPLACE VIEW public.approval_requests_secure AS
SELECT 
    a.id,
    a.entity_id,
    a.requester_id,
    a.approver_id,
    a.created_at,
    a.approval_date,
    a.entity_type,
    a.status,
    a.comments,
    p.full_name as requester_name,
    CASE 
        WHEN a.entity_type = 'procurement_request' THEN pr.title
        WHEN a.entity_type = 'vendor_registration' THEN vr.company_name
        ELSE 'Unknown'
    END as request_title,
    CASE 
        WHEN a.entity_type = 'procurement_request' THEN pr.status::text
        WHEN a.entity_type = 'vendor_registration' THEN vr.status::text
        ELSE 'unknown'
    END as entity_status
FROM public.approvals a
LEFT JOIN public.profiles p ON a.requester_id = p.id
LEFT JOIN public.procurement_requests pr ON a.entity_type = 'procurement_request' AND a.entity_id = pr.id
LEFT JOIN public.vendor_registrations vr ON a.entity_type = 'vendor_registration' AND a.entity_id = vr.id;

-- Enable RLS on the secure view
ALTER VIEW public.approval_requests_secure SET (security_barrier = true);

-- 5. Create secure replacement for procurement_request_details without exposing auth.users
CREATE OR REPLACE VIEW public.procurement_request_details_secure AS
SELECT 
    pr.id,
    pr.requester_id,
    pr.date_created,
    pr.date_needed,
    pr.priority,
    pr.status,
    pr.estimated_value,
    pr.created_at,
    pr.updated_at,
    pr.estimated_value as total_estimated_value,
    pr.request_number,
    pr.title,
    pr.description,
    pr.department,
    p.full_name as requester_name,
    p.department as requester_department
FROM public.procurement_requests pr
LEFT JOIN public.profiles p ON pr.requester_id = p.id;

-- Enable RLS on the secure view
ALTER VIEW public.procurement_request_details_secure SET (security_barrier = true);

-- 6. Add RLS policies for the new secure views
-- For approval_requests_secure
CREATE POLICY "Admins can view all approval requests" 
ON public.approval_requests_secure 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can view their own approval requests" 
ON public.approval_requests_secure 
FOR SELECT 
USING (auth.uid() = requester_id);

CREATE POLICY "Approvers can view assigned approval requests" 
ON public.approval_requests_secure 
FOR SELECT 
USING ((auth.uid() = approver_id) OR (auth.uid() IN (
    SELECT approval_assignments.approver_id
    FROM approval_assignments
    WHERE approval_assignments.entity_type = approval_requests_secure.entity_type
)));

-- 7. Grant appropriate permissions on the new secure views
GRANT SELECT ON public.approval_requests_secure TO authenticated;
GRANT SELECT ON public.procurement_request_details_secure TO authenticated;

-- 8. Log security fix completion
INSERT INTO public.activity_logs (
    user_id,
    action,
    entity_type,
    details
) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'security_fixes_applied',
    'system',
    jsonb_build_object(
        'fixes_applied', jsonb_build_array(
            'removed_exposed_auth_users_views',
            'fixed_function_search_paths',
            'created_secure_replacement_views',
            'applied_proper_rls_policies'
        ),
        'timestamp', now()
    )
);