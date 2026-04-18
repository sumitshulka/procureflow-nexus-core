CREATE OR REPLACE FUNCTION public.initiate_po_approval(p_po_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  po_record RECORD;
  required_level_id UUID;
  base_currency TEXT;
  converted_amount NUMERIC;
  inserted_count INTEGER := 0;
BEGIN
  SELECT * INTO po_record FROM purchase_orders WHERE id = p_po_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Purchase order not found');
  END IF;

  base_currency := get_organization_base_currency();
  converted_amount := po_record.final_amount;

  required_level_id := get_po_approval_level(converted_amount);
  IF required_level_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No approval level configured for this amount');
  END IF;

  -- Insert approvers from matrix (by explicit user OR by role)
  INSERT INTO po_approval_history (purchase_order_id, approval_level_id, approver_id, status)
  SELECT p_po_id, required_level_id, a.approver_id, 'pending'
  FROM (
    SELECT DISTINCT approver_id FROM (
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
    ) s WHERE approver_id IS NOT NULL
  ) a;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  -- Fallback: assign to ALL users holding any admin/administrator role
  IF inserted_count = 0 THEN
    INSERT INTO po_approval_history (purchase_order_id, approval_level_id, approver_id, status)
    SELECT DISTINCT p_po_id, required_level_id, ur.user_id, 'pending'
    FROM public.user_roles ur
    JOIN public.custom_roles cr ON cr.id = ur.role_id
    WHERE LOWER(cr.name) IN ('admin','administrator')
      AND (cr.is_active IS NULL OR cr.is_active = true);

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
  END IF;

  IF inserted_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'No approvers found (no approvers in matrix and no admins configured)');
  END IF;

  UPDATE purchase_orders
  SET status = 'pending_approval',
      approval_status = 'pending_approval',
      submitted_for_approval_at = NOW(),
      current_approval_level = (SELECT level_number FROM po_approval_levels WHERE id = required_level_id)
  WHERE id = p_po_id;

  RETURN jsonb_build_object('success', true, 'message', 'PO submitted for approval', 'approvers_count', inserted_count);
END;
$function$;