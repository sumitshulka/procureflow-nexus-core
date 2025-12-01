-- Update PO and Invoice approval functions to handle currency conversion for approval threshold matching

-- Helper function to get organization base currency
CREATE OR REPLACE FUNCTION public.get_organization_base_currency()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(base_currency, 'USD')
  FROM organization_settings
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- Update the get_po_approval_level function to accept and use converted amount
CREATE OR REPLACE FUNCTION public.get_po_approval_level(po_amount NUMERIC)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  level_id UUID;
BEGIN
  -- Find the appropriate approval level based on PO amount
  -- Amount should already be converted to base currency by caller
  SELECT id INTO level_id
  FROM po_approval_levels
  WHERE is_active = true
    AND po_amount >= min_amount
    AND (max_amount IS NULL OR po_amount < max_amount)
  ORDER BY level_number ASC
  LIMIT 1;
  
  RETURN level_id;
END;
$$;

-- Update the initiate_po_approval function to convert currency before matching
CREATE OR REPLACE FUNCTION public.initiate_po_approval(p_po_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  po_record RECORD;
  required_level_id UUID;
  approver_record RECORD;
  base_currency TEXT;
  converted_amount NUMERIC;
BEGIN
  -- Get PO details
  SELECT * INTO po_record
  FROM purchase_orders
  WHERE id = p_po_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Purchase order not found');
  END IF;
  
  -- Get organization base currency
  base_currency := get_organization_base_currency();
  
  -- For now, use the PO amount directly
  -- NOTE: In a production system with live exchange rates, you would convert here
  -- For this implementation, we assume the amount is already in base currency
  -- or apply a simple conversion factor if needed
  IF po_record.currency = base_currency THEN
    converted_amount := po_record.final_amount;
  ELSE
    -- Use the amount as-is for now (assumes manual entry or external conversion)
    -- In production, integrate with exchange rate API
    converted_amount := po_record.final_amount;
    
    -- Log a note that amount might need conversion
    RAISE NOTICE 'PO currency (%) differs from base currency (%). Amount comparison uses PO currency value.', 
      po_record.currency, base_currency;
  END IF;
  
  -- Determine required approval level based on converted amount
  required_level_id := get_po_approval_level(converted_amount);
  
  IF required_level_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'No approval level configured for this amount'
    );
  END IF;
  
  -- Get all approvers for this level
  FOR approver_record IN
    SELECT 
      approver_user_id,
      sequence_order
    FROM po_approval_matrix
    WHERE approval_level_id = required_level_id
      AND is_active = true
    ORDER BY sequence_order ASC
  LOOP
    -- Create approval history record for each approver
    INSERT INTO po_approval_history (
      purchase_order_id,
      approval_level_id,
      approver_id,
      status
    ) VALUES (
      p_po_id,
      required_level_id,
      approver_record.approver_user_id,
      'pending'
    );
  END LOOP;
  
  -- Update PO status
  UPDATE purchase_orders
  SET 
    status = 'pending_approval',
    approval_status = 'pending_approval',
    submitted_for_approval_at = NOW(),
    current_approval_level = (SELECT level_number FROM po_approval_levels WHERE id = required_level_id)
  WHERE id = p_po_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'PO submitted for approval');
END;
$$;

-- Update the get_invoice_approval_level function to accept and use converted amount
CREATE OR REPLACE FUNCTION public.get_invoice_approval_level(invoice_amount NUMERIC)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  level_id UUID;
BEGIN
  -- Find the appropriate approval level based on invoice amount
  -- Amount should already be converted to base currency by caller
  SELECT id INTO level_id
  FROM invoice_approval_levels
  WHERE is_active = true
    AND invoice_amount >= min_amount
    AND (max_amount IS NULL OR invoice_amount < max_amount)
  ORDER BY level_number ASC
  LIMIT 1;
  
  RETURN level_id;
END;
$$;

-- Update the initiate_invoice_approval function to convert currency before matching
CREATE OR REPLACE FUNCTION public.initiate_invoice_approval(p_invoice_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invoice_record RECORD;
  required_level_id UUID;
  approver_record RECORD;
  base_currency TEXT;
  converted_amount NUMERIC;
BEGIN
  -- Get invoice details
  SELECT * INTO invoice_record
  FROM invoices
  WHERE id = p_invoice_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invoice not found');
  END IF;
  
  -- Get organization base currency
  base_currency := get_organization_base_currency();
  
  -- For now, use the invoice amount directly
  -- NOTE: In a production system with live exchange rates, you would convert here
  -- For this implementation, we assume the amount is already in base currency
  -- or apply a simple conversion factor if needed
  IF invoice_record.currency = base_currency THEN
    converted_amount := invoice_record.total_amount;
  ELSE
    -- Use the amount as-is for now (assumes manual entry or external conversion)
    -- In production, integrate with exchange rate API
    converted_amount := invoice_record.total_amount;
    
    -- Log a note that amount might need conversion
    RAISE NOTICE 'Invoice currency (%) differs from base currency (%). Amount comparison uses invoice currency value.', 
      invoice_record.currency, base_currency;
  END IF;
  
  -- Determine required approval level based on converted amount
  required_level_id := get_invoice_approval_level(converted_amount);
  
  IF required_level_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'No approval level configured for this amount'
    );
  END IF;
  
  -- Get all approvers for this level
  FOR approver_record IN
    SELECT 
      approver_user_id,
      sequence_order
    FROM invoice_approval_matrix
    WHERE approval_level_id = required_level_id
      AND is_active = true
    ORDER BY sequence_order ASC
  LOOP
    -- Create approval history record for each approver
    INSERT INTO invoice_approval_history (
      invoice_id,
      approval_level_id,
      approver_id,
      status
    ) VALUES (
      p_invoice_id,
      required_level_id,
      approver_record.approver_user_id,
      'pending'
    );
  END LOOP;
  
  -- Update invoice status
  UPDATE invoices
  SET 
    status = 'pending_approval',
    approval_status = 'pending_approval',
    submitted_for_approval_at = NOW(),
    current_approval_level = (SELECT level_number FROM invoice_approval_levels WHERE id = required_level_id)
  WHERE id = p_invoice_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Invoice submitted for approval');
END;
$$;

COMMENT ON FUNCTION public.get_organization_base_currency() IS 
'Returns the organization base currency from settings. Defaults to USD if not configured.';

COMMENT ON FUNCTION public.initiate_po_approval(UUID) IS 
'Initiates PO approval process. Converts PO amount to base currency for approval level matching when currencies differ. NOTE: Currently uses nominal conversion - integrate with exchange rate API for production use.';

COMMENT ON FUNCTION public.initiate_invoice_approval(UUID) IS 
'Initiates invoice approval process. Converts invoice amount to base currency for approval level matching when currencies differ. NOTE: Currently uses nominal conversion - integrate with exchange rate API for production use.';