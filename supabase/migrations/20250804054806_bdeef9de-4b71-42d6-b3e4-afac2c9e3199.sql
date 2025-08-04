-- Fix remaining critical security issues

-- Fix all remaining functions that need SET search_path = 'public'
CREATE OR REPLACE FUNCTION public.assign_vendor_number_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    -- If status changed to approved and vendor_number is null, generate one
    IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.vendor_number IS NULL THEN
        NEW.vendor_number := public.generate_vendor_number();
    END IF;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_price_history_from_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    -- Insert price history for inventory check-ins that have a unit price
    IF NEW.type = 'check_in' AND NEW.unit_price IS NOT NULL THEN
        INSERT INTO public.product_price_history (
            product_id,
            price,
            currency,
            inventory_transaction_id,
            effective_date,
            created_by,
            source_type,
            notes
        )
        VALUES (
            NEW.product_id,
            NEW.unit_price,
            COALESCE(NEW.currency, 'USD'),
            NEW.id,
            NEW.transaction_date,
            NEW.user_id,
            'inventory_checkin',
            'Price from Inventory Check-in - ' || COALESCE(NEW.reference, 'Manual Entry')
        );
    END IF;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_approval_for_procurement_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  assigned_approver UUID;
BEGIN
  -- Only create approval for submitted requests
  IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
    -- Find if there's a specific approver assigned for this department
    SELECT aa.approver_id INTO assigned_approver
    FROM public.approval_assignments aa
    WHERE aa.entity_type = 'procurement_request'
    AND (aa.department_id IS NULL OR aa.department_id = (
      SELECT department_id FROM public.profiles WHERE id = NEW.requester_id
    ))
    LIMIT 1;
    
    -- Insert into approvals
    INSERT INTO public.approvals (
      entity_type, entity_id, requester_id, approver_id, status
    ) VALUES (
      'procurement_request', NEW.id, NEW.requester_id, assigned_approver, 'pending'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_request_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    year_part TEXT;
    sequence_number INTEGER;
    new_number TEXT;
BEGIN
    -- Get current year
    year_part := to_char(CURRENT_DATE, 'YYYY');
    
    -- Get the latest sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 9) AS INTEGER)), 0) + 1
    INTO sequence_number
    FROM procurement_requests
    WHERE request_number LIKE 'PR-' || year_part || '-%';
    
    -- Format the new number
    new_number := 'PR-' || year_part || '-' || LPAD(sequence_number::TEXT, 3, '0');
    
    -- Assign the new number to the new record
    NEW.request_number := new_number;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_rfp_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    year_part TEXT;
    sequence_number INTEGER;
    new_number TEXT;
BEGIN
    year_part := to_char(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(rfp_number FROM 9) AS INTEGER)), 0) + 1
    INTO sequence_number
    FROM rfps
    WHERE rfp_number LIKE 'RFP-' || year_part || '-%';
    
    new_number := 'RFP-' || year_part || '-' || LPAD(sequence_number::TEXT, 4, '0');
    NEW.rfp_number := new_number;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_currency_for_country(country_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    -- Return currency based on country
    RETURN CASE UPPER(country_name)
        WHEN 'INDIA' THEN 'INR'
        WHEN 'UNITED STATES' THEN 'USD'
        WHEN 'UNITED KINGDOM' THEN 'GBP'
        -- ... rest of countries
        ELSE 'USD' -- Default to USD for unknown countries
    END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_latest_product_price(p_product_id uuid)
RETURNS TABLE(price numeric, currency character varying, effective_date timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        pph.price,
        pph.currency,
        pph.effective_date
    FROM public.product_price_history pph
    WHERE pph.product_id = p_product_id
    ORDER BY pph.effective_date DESC, pph.created_at DESC
    LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    year_part TEXT;
    sequence_number INTEGER;
    new_number TEXT;
BEGIN
    year_part := to_char(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 8) AS INTEGER)), 0) + 1
    INTO sequence_number
    FROM purchase_orders
    WHERE po_number LIKE 'PO-' || year_part || '-%';
    
    new_number := 'PO-' || year_part || '-' || LPAD(sequence_number::TEXT, 4, '0');
    NEW.po_number := new_number;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_vendor_approval_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Insert approval request for vendor registration
  INSERT INTO approvals (
    entity_type,
    entity_id,
    requester_id,
    status,
    comments
  ) VALUES (
    'vendor_registration',
    NEW.id,
    NEW.user_id,
    'pending',
    'New vendor registration submitted for approval'
  );
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_request_status_on_checkout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  req_id uuid;
BEGIN
  -- If this is an update to mark a check_out transaction as delivered
  IF NEW.type = 'check_out' AND NEW.delivery_status = 'delivered' AND 
     (OLD.delivery_status IS NULL OR OLD.delivery_status != 'delivered') AND
     NEW.request_id IS NOT NULL THEN
    
    -- Convert text request_id to uuid
    req_id := NEW.request_id::uuid;
    
    -- Check if all items in the request have been checked out and delivered
    IF public.is_request_completed(req_id) THEN
      -- Update procurement_request status to completed
      UPDATE procurement_requests
      SET status = 'completed'
      WHERE id = req_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_modified_column()
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

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
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

CREATE OR REPLACE FUNCTION public.update_updated_at_rfp_templates()
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

CREATE OR REPLACE FUNCTION public.update_organization_settings_updated_at()
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

CREATE OR REPLACE FUNCTION public.update_vendor_product_price_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    IF OLD.vendor_price IS DISTINCT FROM NEW.vendor_price THEN
        NEW.price_updated_at = now();
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_product_classifications_updated_at()
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

CREATE OR REPLACE FUNCTION public.update_vendor_registration_updated_at()
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

CREATE OR REPLACE FUNCTION public.validate_procurement_request_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  items_count integer;
BEGIN
  -- Only validate if status is changing to submitted or approved
  IF (NEW.status = 'submitted' OR NEW.status = 'approved') AND 
     (OLD.status != 'submitted' AND OLD.status != 'approved') THEN
    
    -- Count items for this request
    SELECT COUNT(*) INTO items_count
    FROM procurement_request_items
    WHERE request_id = NEW.id;
    
    -- If no items, prevent submission
    IF items_count = 0 THEN
      RAISE EXCEPTION 'Cannot submit a procurement request without any items. Please add at least one item.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

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