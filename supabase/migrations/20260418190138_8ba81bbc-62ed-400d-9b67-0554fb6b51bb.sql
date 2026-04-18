
-- 1. Recreate view as SECURITY INVOKER
DROP VIEW IF EXISTS public.vendor_compliance_overview;
CREATE VIEW public.vendor_compliance_overview
WITH (security_invoker = true) AS
SELECT vr.id AS vendor_id, vr.company_name, vr.status AS vendor_status,
  cp.id AS policy_id, cp.title AS policy_title, cp.category,
  cp.vendor_requirement_type, cp.vendor_requirement_mandatory, cp.validity_months,
  COALESCE(vps.status, 'pending') AS submission_status,
  vps.submitted_at, vps.expires_at, vps.document_url,
  vps.declaration_accepted, vps.reviewed_at, vps.review_notes
FROM public.vendor_registrations vr
CROSS JOIN public.compliance_policies cp
LEFT JOIN public.vendor_policy_submissions vps
  ON vps.vendor_id = vr.id AND vps.policy_id = cp.id
WHERE cp.status = 'active' AND cp.vendor_requirement_type <> 'none';

-- 2. Replace overly-permissive "Procurement read all" policy with role-based check
DROP POLICY IF EXISTS "Procurement read all submissions" ON public.vendor_policy_submissions;
CREATE POLICY "Staff read all submissions" ON public.vendor_policy_submissions
  FOR SELECT TO authenticated USING (
    public.is_admin()
    OR public.has_role(auth.uid(), 'procurement_officer'::public.user_role)
    OR public.has_role(auth.uid(), 'finance_officer'::public.user_role)
  );
