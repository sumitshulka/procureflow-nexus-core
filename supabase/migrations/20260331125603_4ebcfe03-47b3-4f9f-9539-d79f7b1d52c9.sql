
CREATE OR REPLACE FUNCTION public.initiate_po_approval(p_po_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  po_record RECORD;
  required_level_id UUID;
  base_currency TEXT;
  converted_amount NUMERIC;
  inserted_count INTEGER := 0;
  admin_role_id UUID;
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
  IF po_record.currency = base_currency THEN
    converted_amount := po_record.final_amount;
  ELSE
    converted_amount := po_record.final_amount;
  END IF;

  -- Determine required approval level
  required_level_id := get_po_approval_level(converted_amount);

  IF required_level_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No approval level configured for this amount');
  END IF;

  -- Insert approvers from matrix (by explicit user OR by role)
  INSERT INTO po_approval_history (purchase_order_id, approval_level_id, approver_id, status)
  SELECT p_po_id, required_level_id, a.approver_id, 'pending'
  FROM (
    SELECT DISTINCT approver_id
    FROM (
      SELECT pam.approver_user_id AS approver_id
      FROM public.po_approval_matrix pam
      WHERE pam.approval_level_id = required_level_id
        AND pam.is_active = true
        AND pam.approver_user_id IS NOT NULL

      UNION ALL

      SELECT ur.user_id AS approver_id
      FROM public.po_approval_matrix pam
      JOIN public.custom_roles cr ON cr.name::text = pam.approver_role::text
      JOIN public.user_roles ur ON ur.role_id = cr.id
      WHERE pam.approval_level_id = required_level_id
        AND pam.is_active = true
        AND pam.approver_user_id IS NULL
        AND pam.approver_role IS NOT NULL
    ) s
    WHERE approver_id IS NOT NULL
  ) a;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  -- Fallback: if no approvers configured, assign to admins by default
  IF inserted_count = 0 THEN
    -- Find admin role id from custom_roles
    SELECT id INTO admin_role_id FROM public.custom_roles 
    WHERE LOWER(name) IN ('admin', 'administrator') AND (is_active IS NULL OR is_active = true)
    LIMIT 1;

    IF admin_role_id IS NOT NULL THEN
      INSERT INTO po_approval_history (purchase_order_id, approval_level_id, approver_id, status)
      SELECT p_po_id, required_level_id, ur.user_id, 'pending'
      FROM public.user_roles ur
      WHERE ur.role_id = admin_role_id;

      GET DIAGNOSTICS inserted_count = ROW_COUNT;
    END IF;
  END IF;

  IF inserted_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'No approvers found (no approvers in matrix and no admins configured)');
  END IF;

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
