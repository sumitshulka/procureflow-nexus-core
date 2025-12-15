-- Ensure invoice/PO submissions always create approver queue items (fallback to roles/admin)

CREATE OR REPLACE FUNCTION public.initiate_invoice_approval(p_invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invoice_record RECORD;
  required_level_id UUID;
  base_currency TEXT;
  converted_amount NUMERIC;
  inserted_count INTEGER := 0;
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
  IF invoice_record.currency = base_currency THEN
    converted_amount := invoice_record.total_amount;
  ELSE
    converted_amount := invoice_record.total_amount;
    RAISE NOTICE 'Invoice currency (%) differs from base currency (%). Amount comparison uses invoice currency value.',
      invoice_record.currency, base_currency;
  END IF;

  -- Determine required approval level
  required_level_id := get_invoice_approval_level(converted_amount);

  IF required_level_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No approval level configured for this amount');
  END IF;

  -- Insert approvers from matrix (by explicit user OR by role)
  INSERT INTO invoice_approval_history (invoice_id, approval_level_id, approver_id, status)
  SELECT p_invoice_id, required_level_id, a.approver_id, 'pending'
  FROM (
    SELECT DISTINCT approver_id
    FROM (
      SELECT iam.approver_user_id AS approver_id
      FROM public.invoice_approval_matrix iam
      WHERE iam.approval_level_id = required_level_id
        AND iam.is_active = true
        AND iam.approver_user_id IS NOT NULL

      UNION ALL

      SELECT ur.user_id AS approver_id
      FROM public.invoice_approval_matrix iam
      JOIN public.user_roles ur ON ur.role = iam.approver_role
      WHERE iam.approval_level_id = required_level_id
        AND iam.is_active = true
        AND iam.approver_user_id IS NULL
        AND iam.approver_role IS NOT NULL
    ) s
    WHERE approver_id IS NOT NULL
  ) a;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  -- Fallback: if no approvers configured, assign to admins by default
  IF inserted_count = 0 THEN
    INSERT INTO invoice_approval_history (invoice_id, approval_level_id, approver_id, status)
    SELECT p_invoice_id, required_level_id, ur.user_id, 'pending'
    FROM public.user_roles ur
    WHERE ur.role = 'admin'::user_role;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
  END IF;

  IF inserted_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'No approvers found (no approvers in matrix and no admins configured)');
  END IF;

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
    RAISE NOTICE 'PO currency (%) differs from base currency (%). Amount comparison uses PO currency value.',
      po_record.currency, base_currency;
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
      JOIN public.user_roles ur ON ur.role = pam.approver_role
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
    INSERT INTO po_approval_history (purchase_order_id, approval_level_id, approver_id, status)
    SELECT p_po_id, required_level_id, ur.user_id, 'pending'
    FROM public.user_roles ur
    WHERE ur.role = 'admin'::user_role;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
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

-- Update get_approval_requests_secure to also show invoices/POs that are pending_approval but have no history rows yet
CREATE OR REPLACE FUNCTION public.get_approval_requests_secure()
RETURNS TABLE (
    id uuid,
    entity_id uuid,
    requester_id uuid,
    approver_id uuid,
    created_at timestamp with time zone,
    approval_date timestamp with time zone,
    entity_type text,
    status text,
    comments text,
    requester_name text,
    request_title text,
    entity_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT (
        has_role(auth.uid(), 'admin'::user_role) OR 
        has_role(auth.uid(), 'procurement_officer'::user_role) OR
        has_role(auth.uid(), 'finance_officer'::user_role) OR
        EXISTS(SELECT 1 FROM public.approvals WHERE approvals.requester_id = auth.uid()) OR
        EXISTS(SELECT 1 FROM public.approvals WHERE approvals.approver_id = auth.uid()) OR
        EXISTS(SELECT 1 FROM public.invoice_approval_history WHERE invoice_approval_history.approver_id = auth.uid()) OR
        EXISTS(SELECT 1 FROM public.po_approval_history WHERE po_approval_history.approver_id = auth.uid())
    ) THEN
        RAISE EXCEPTION 'Access denied to approval requests';
    END IF;

    RETURN QUERY
    -- Existing generic approvals
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
    LEFT JOIN public.vendor_registrations vr ON a.entity_type = 'vendor_registration' AND a.entity_id = vr.id
    WHERE 
        (has_role(auth.uid(), 'admin'::user_role)) OR
        (a.requester_id = auth.uid()) OR
        (a.approver_id = auth.uid()) OR
        (auth.uid() IN (
            SELECT aa.approver_id
            FROM public.approval_assignments aa
            WHERE aa.entity_type = a.entity_type
        ))

    UNION ALL

    -- Invoice approvals (history-based)
    SELECT 
        iah.id,
        iah.invoice_id as entity_id,
        inv.created_by as requester_id,
        iah.approver_id,
        iah.created_at,
        COALESCE(iah.approved_at, iah.rejected_at) as approval_date,
        'invoice'::text as entity_type,
        iah.status,
        iah.comments,
        p.full_name as requester_name,
        inv.invoice_number as request_title,
        inv.status as entity_status
    FROM public.invoice_approval_history iah
    JOIN public.invoices inv ON iah.invoice_id = inv.id
    LEFT JOIN public.profiles p ON inv.created_by = p.id
    WHERE 
        (has_role(auth.uid(), 'admin'::user_role)) OR
        (has_role(auth.uid(), 'finance_officer'::user_role)) OR
        (inv.created_by = auth.uid()) OR
        (iah.approver_id = auth.uid())

    UNION ALL

    -- Invoice submissions missing history (visibility fallback)
    SELECT
        inv.id as id,
        inv.id as entity_id,
        inv.created_by as requester_id,
        NULL::uuid as approver_id,
        inv.submitted_for_approval_at as created_at,
        NULL::timestamptz as approval_date,
        'invoice'::text as entity_type,
        'pending'::text as status,
        NULL::text as comments,
        p.full_name as requester_name,
        inv.invoice_number as request_title,
        inv.status as entity_status
    FROM public.invoices inv
    LEFT JOIN public.profiles p ON inv.created_by = p.id
    WHERE inv.status = 'pending_approval'
      AND NOT EXISTS (SELECT 1 FROM public.invoice_approval_history iah WHERE iah.invoice_id = inv.id)
      AND (
        has_role(auth.uid(), 'admin'::user_role) OR
        has_role(auth.uid(), 'finance_officer'::user_role) OR
        inv.created_by = auth.uid()
      )

    UNION ALL

    -- Purchase Order approvals (history-based)
    SELECT 
        pah.id,
        pah.purchase_order_id as entity_id,
        po.created_by as requester_id,
        pah.approver_id,
        pah.created_at,
        COALESCE(pah.approved_at, pah.rejected_at) as approval_date,
        'purchase_order'::text as entity_type,
        pah.status,
        pah.comments,
        p.full_name as requester_name,
        po.po_number as request_title,
        po.status as entity_status
    FROM public.po_approval_history pah
    JOIN public.purchase_orders po ON pah.purchase_order_id = po.id
    LEFT JOIN public.profiles p ON po.created_by = p.id
    WHERE 
        (has_role(auth.uid(), 'admin'::user_role)) OR
        (has_role(auth.uid(), 'procurement_officer'::user_role)) OR
        (po.created_by = auth.uid()) OR
        (pah.approver_id = auth.uid())

    UNION ALL

    -- PO submissions missing history (visibility fallback)
    SELECT
        po.id as id,
        po.id as entity_id,
        po.created_by as requester_id,
        NULL::uuid as approver_id,
        po.submitted_for_approval_at as created_at,
        NULL::timestamptz as approval_date,
        'purchase_order'::text as entity_type,
        'pending'::text as status,
        NULL::text as comments,
        p.full_name as requester_name,
        po.po_number as request_title,
        po.status as entity_status
    FROM public.purchase_orders po
    LEFT JOIN public.profiles p ON po.created_by = p.id
    WHERE po.status = 'pending_approval'
      AND NOT EXISTS (SELECT 1 FROM public.po_approval_history pah WHERE pah.purchase_order_id = po.id)
      AND (
        has_role(auth.uid(), 'admin'::user_role) OR
        has_role(auth.uid(), 'procurement_officer'::user_role) OR
        po.created_by = auth.uid()
      );
END;
$$;