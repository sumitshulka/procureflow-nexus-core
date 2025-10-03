-- Fix the ambiguous requester_id error in get_approval_requests_secure function
CREATE OR REPLACE FUNCTION public.get_approval_requests_secure()
RETURNS TABLE(
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
        EXISTS(SELECT 1 FROM public.approvals WHERE approvals.requester_id = auth.uid()) OR
        EXISTS(SELECT 1 FROM public.approvals WHERE approvals.approver_id = auth.uid())
    ) THEN
        RAISE EXCEPTION 'Access denied to approval requests';
    END IF;

    RETURN QUERY
    SELECT 
        a.id,
        a.entity_id,
        a.requester_id,  -- Explicitly qualify with table alias
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
        -- Apply RLS logic within the function
        (has_role(auth.uid(), 'admin'::user_role)) OR
        (a.requester_id = auth.uid()) OR
        (a.approver_id = auth.uid()) OR
        (auth.uid() IN (
            SELECT aa.approver_id
            FROM public.approval_assignments aa
            WHERE aa.entity_type = a.entity_type
        ));
END;
$$;

-- Drop duplicate "Admins can update any profile" policy if it exists
DO $$ 
BEGIN
    -- Check if there are multiple policies with the same name
    IF (SELECT COUNT(*) FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND policyname = 'Admins can update any profile') > 1 THEN
        -- Keep only one
        DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
        -- Recreate it
        CREATE POLICY "Admins can update any profile" 
        ON public.profiles 
        FOR UPDATE 
        TO authenticated 
        USING (has_role(auth.uid(), 'admin'::user_role));
    END IF;
END $$;