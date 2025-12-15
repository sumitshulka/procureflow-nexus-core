-- Update get_approval_requests_secure to include invoice and PO approvals
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
    -- Only allow access to users with appropriate permissions
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
    -- Existing approvals (procurement requests, vendor registrations, etc.)
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
    
    -- Invoice approvals
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
    
    -- Purchase Order approvals
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
        (pah.approver_id = auth.uid());
END;
$$;