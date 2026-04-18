
ALTER TABLE public.compliance_policies
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS policy_key text UNIQUE,
  ADD COLUMN IF NOT EXISTS vendor_requirement_type text NOT NULL DEFAULT 'none'
    CHECK (vendor_requirement_type IN ('none','document','declaration','both')),
  ADD COLUMN IF NOT EXISTS vendor_requirement_mandatory boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vendor_document_description text,
  ADD COLUMN IF NOT EXISTS vendor_declaration_text text,
  ADD COLUMN IF NOT EXISTS validity_months integer;

CREATE TABLE IF NOT EXISTS public.vendor_policy_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendor_registrations(id) ON DELETE CASCADE,
  policy_id uuid NOT NULL REFERENCES public.compliance_policies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','submitted','approved','rejected','expired')),
  document_url text,
  document_name text,
  document_size integer,
  declaration_accepted boolean DEFAULT false,
  declaration_accepted_at timestamptz,
  declaration_signed_by text,
  submitted_at timestamptz,
  expires_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, policy_id)
);

CREATE INDEX IF NOT EXISTS idx_vps_vendor ON public.vendor_policy_submissions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vps_policy ON public.vendor_policy_submissions(policy_id);
CREATE INDEX IF NOT EXISTS idx_vps_status ON public.vendor_policy_submissions(status);

ALTER TABLE public.vendor_policy_submissions ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_vps_updated_at ON public.vendor_policy_submissions;
CREATE TRIGGER trg_vps_updated_at
  BEFORE UPDATE ON public.vendor_policy_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Vendors view own submissions" ON public.vendor_policy_submissions;
CREATE POLICY "Vendors view own submissions" ON public.vendor_policy_submissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.vendor_registrations vr
      WHERE vr.id = vendor_policy_submissions.vendor_id AND vr.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Vendors insert own submissions" ON public.vendor_policy_submissions;
CREATE POLICY "Vendors insert own submissions" ON public.vendor_policy_submissions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.vendor_registrations vr
      WHERE vr.id = vendor_policy_submissions.vendor_id AND vr.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Vendors update own submissions" ON public.vendor_policy_submissions;
CREATE POLICY "Vendors update own submissions" ON public.vendor_policy_submissions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.vendor_registrations vr
      WHERE vr.id = vendor_policy_submissions.vendor_id AND vr.user_id = auth.uid())
    AND status IN ('pending','submitted','rejected')
  );

DROP POLICY IF EXISTS "Admins manage all submissions" ON public.vendor_policy_submissions;
CREATE POLICY "Admins manage all submissions" ON public.vendor_policy_submissions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Procurement read all submissions" ON public.vendor_policy_submissions;
CREATE POLICY "Procurement read all submissions" ON public.vendor_policy_submissions
  FOR SELECT TO authenticated USING (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-compliance-docs','vendor-compliance-docs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Vendor compliance read own" ON storage.objects;
CREATE POLICY "Vendor compliance read own" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'vendor-compliance-docs' AND (
      public.is_admin() OR EXISTS (
        SELECT 1 FROM public.vendor_registrations vr
        WHERE vr.id::text = (storage.foldername(name))[1] AND vr.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Vendor compliance upload own" ON storage.objects;
CREATE POLICY "Vendor compliance upload own" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'vendor-compliance-docs' AND EXISTS (
      SELECT 1 FROM public.vendor_registrations vr
      WHERE vr.id::text = (storage.foldername(name))[1] AND vr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Vendor compliance update own" ON storage.objects;
CREATE POLICY "Vendor compliance update own" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'vendor-compliance-docs' AND EXISTS (
      SELECT 1 FROM public.vendor_registrations vr
      WHERE vr.id::text = (storage.foldername(name))[1] AND vr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Vendor compliance delete own" ON storage.objects;
CREATE POLICY "Vendor compliance delete own" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'vendor-compliance-docs' AND (
      public.is_admin() OR EXISTS (
        SELECT 1 FROM public.vendor_registrations vr
        WHERE vr.id::text = (storage.foldername(name))[1] AND vr.user_id = auth.uid()
      )
    )
  );

INSERT INTO public.compliance_policies
  (title, category, description, content, version, effective_date, review_date, owner, status,
   is_system, policy_key, vendor_requirement_type, vendor_requirement_mandatory,
   vendor_document_description, vendor_declaration_text, validity_months)
VALUES
('Vendor Code of Conduct','Vendor Management',
 'Establishes ethical standards expected from all vendors doing business with the organization.',
 'All vendors shall conduct business with integrity, treat workers fairly, prohibit forced/child labor, comply with all applicable laws, and refrain from discriminatory practices. Vendors are expected to cascade these standards to their own subcontractors.',
 '1.0', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year','Procurement Head','active',
 true,'vendor_code_of_conduct','both',true,
 'Signed Vendor Code of Conduct acknowledgement on company letterhead (PDF).',
 'I confirm that our company has read, understood, and will abide by the Vendor Code of Conduct in all dealings with the organization.', 12),
('Anti-Bribery & Anti-Corruption','Compliance',
 'Zero-tolerance policy against bribery, kickbacks, facilitation payments and corrupt practices.',
 'Vendors shall not offer, promise, give, request, or accept any improper financial or other advantage in connection with business activities. Compliance with FCPA, UK Bribery Act and local anti-corruption laws is mandatory.',
 '1.0', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year','Compliance Officer','active',
 true,'anti_bribery','declaration',true, NULL,
 'We declare that neither our company nor any employee, agent or representative has offered or will offer any bribe, kickback, or improper inducement to any employee or representative of the organization.', 12),
('Data Protection & Privacy','Security',
 'Governs handling of personal and sensitive data shared between organization and vendors.',
 'Vendors processing personal data must comply with GDPR / applicable data protection regulations, implement appropriate technical and organizational measures, restrict access on a need-to-know basis, and notify any breach within 72 hours.',
 '1.0', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year','Data Protection Officer','active',
 true,'data_protection','both',true,
 'Data Processing Agreement (DPA) signed and any relevant certifications (e.g., ISO 27701).',
 'We confirm compliance with applicable data protection laws and agree to process personal data only as instructed by the organization.', 12),
('Information Security','Security',
 'Defines minimum information security standards for vendors with system or data access.',
 'Vendors shall implement controls aligned with ISO 27001 / SOC 2 including access management, encryption in transit and at rest, vulnerability management, and incident response. Annual security attestation required.',
 '1.0', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year','CISO','active',
 true,'information_security','document',false,
 'Latest information security certificate (ISO 27001 / SOC 2 Type II) or completed security questionnaire.', NULL, 12),
('Quality Management','Operations',
 'Sets quality assurance expectations for goods and services supplied to the organization.',
 'Vendors are expected to maintain a documented quality management system. Goods must meet specifications agreed in the Purchase Order. Defective items will be returned at vendor cost.',
 '1.0', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year','Quality Head','active',
 true,'quality_management','document',false,
 'ISO 9001 certificate or equivalent quality management documentation (optional but preferred).', NULL, 24),
('Health & Safety','Operations',
 'Health, safety and environmental obligations for vendors operating on organization premises.',
 'Vendors performing on-site work shall comply with all applicable OH&S regulations, provide PPE to their workers, conduct risk assessments, and report all incidents within 24 hours.',
 '1.0', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year','HSE Manager','active',
 true,'health_safety','declaration',false, NULL,
 'We confirm that our employees and subcontractors deployed on organization premises will comply with applicable Health, Safety & Environmental regulations.', 12),
('Conflict of Interest','Compliance',
 'Requires vendors to disclose any actual, potential, or perceived conflicts of interest.',
 'Vendors must disclose any relationship (financial, familial, or otherwise) with employees of the organization that could influence procurement decisions. Non-disclosure may result in contract termination.',
 '1.0', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year','Compliance Officer','active',
 true,'conflict_of_interest','declaration',true, NULL,
 'We declare that no director, officer or employee of our company has any undisclosed personal, financial, or familial relationship with any employee of the organization that could constitute a conflict of interest.', 12),
('Confidentiality / NDA','Legal',
 'Protects confidential information exchanged during the business relationship.',
 'Vendors agree to keep all non-public information received from the organization confidential, use it solely for the intended purpose, and return or destroy it upon contract conclusion.',
 '1.0', CURRENT_DATE, CURRENT_DATE + INTERVAL '2 years','Legal Counsel','active',
 true,'confidentiality_nda','both',true,
 'Signed Non-Disclosure Agreement (NDA) on vendor letterhead.',
 'We agree to maintain strict confidentiality of all non-public information shared by the organization.', 24),
('Tax Compliance','Finance',
 'Ensures vendors are compliant with all applicable tax regulations.',
 'Vendors must hold valid tax registrations (PAN, GST/VAT, etc.), file returns on time, and provide valid tax invoices. The organization reserves the right to withhold payments if tax compliance is not demonstrated.',
 '1.0', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year','Finance Head','active',
 true,'tax_compliance','document',true,
 'Copies of valid PAN, GST/VAT registration certificate, and most recent tax return acknowledgement.', NULL, 12),
('Insurance & Liability Coverage','Finance',
 'Mandatory insurance coverage required for vendors providing high-risk services.',
 'Vendors shall maintain appropriate insurance — including general liability, workers compensation, and professional indemnity where applicable — and provide certificates of insurance naming the organization as additional insured where relevant.',
 '1.0', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year','Risk Manager','active',
 true,'insurance_coverage','document',false,
 'Current Certificate(s) of Insurance covering general / professional / workers compensation liability.', NULL, 12),
('Modern Slavery & Human Rights','Compliance',
 'Prohibits all forms of modern slavery, human trafficking and forced labor in vendor supply chains.',
 'Vendors must not engage in or tolerate any form of slavery, servitude, forced or compulsory labor, or human trafficking, and must take reasonable steps to ensure the same in their own supply chain.',
 '1.0', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year','Compliance Officer','active',
 true,'modern_slavery','declaration',true, NULL,
 'We declare that our operations and supply chain are free from modern slavery, human trafficking, child labor, and forced labor.', 12),
('ESG / Sustainability','Operations',
 'Encourages environmentally and socially responsible practices throughout the supply chain.',
 'Vendors are expected to minimize environmental impact, comply with applicable environmental regulations, and progressively improve sustainability performance. Disclosure of ESG metrics is encouraged.',
 '1.0', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year','Sustainability Officer','active',
 true,'esg_sustainability','both',false,
 'ESG/Sustainability report, environmental certifications, or completed ESG questionnaire.',
 'We commit to operating in an environmentally and socially responsible manner and to continuously improving our sustainability practices.', 24)
ON CONFLICT (policy_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.recalc_policy_compliance_rate(_policy_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total_vendors int; v_compliant_vendors int; v_vendor_rate numeric;
  v_total_checks int; v_passed_checks int; v_check_rate numeric;
  v_final numeric; v_req_type text;
BEGIN
  SELECT vendor_requirement_type INTO v_req_type FROM public.compliance_policies WHERE id = _policy_id;
  SELECT COUNT(*) INTO v_total_vendors FROM public.vendor_registrations WHERE status = 'approved';
  IF v_req_type = 'none' OR v_total_vendors = 0 THEN
    v_vendor_rate := NULL;
  ELSE
    SELECT COUNT(*) INTO v_compliant_vendors
    FROM public.vendor_registrations vr
    JOIN public.vendor_policy_submissions vps ON vps.vendor_id = vr.id AND vps.policy_id = _policy_id
    WHERE vr.status = 'approved' AND vps.status = 'approved'
      AND (vps.expires_at IS NULL OR vps.expires_at > now());
    v_vendor_rate := (v_compliant_vendors::numeric / v_total_vendors) * 100;
  END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE cc.status IN ('passed','compliant'))
    INTO v_total_checks, v_passed_checks
  FROM public.compliance_checks cc
  JOIN public.compliance_rules cr ON cr.id = cc.rule_id
  JOIN public.compliance_areas ca ON ca.id = cr.area_id
  JOIN public.compliance_policies cp ON cp.id = _policy_id AND lower(cp.category) = lower(ca.name);
  IF v_total_checks = 0 THEN v_check_rate := NULL;
  ELSE v_check_rate := (v_passed_checks::numeric / v_total_checks) * 100; END IF;

  IF v_vendor_rate IS NULL AND v_check_rate IS NULL THEN v_final := NULL;
  ELSIF v_vendor_rate IS NULL THEN v_final := v_check_rate;
  ELSIF v_check_rate IS NULL THEN v_final := v_vendor_rate;
  ELSE v_final := (v_vendor_rate + v_check_rate) / 2;
  END IF;

  UPDATE public.compliance_policies
  SET compliance_rate = ROUND(v_final, 1), updated_at = now()
  WHERE id = _policy_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalc_all_policy_compliance_rates()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.compliance_policies LOOP
    PERFORM public.recalc_policy_compliance_rate(r.id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalc_on_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recalc_policy_compliance_rate(COALESCE(NEW.policy_id, OLD.policy_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_vps_recalc ON public.vendor_policy_submissions;
CREATE TRIGGER trg_vps_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.vendor_policy_submissions
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_on_submission();

CREATE OR REPLACE FUNCTION public.trg_recalc_on_check()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT cp.id FROM public.compliance_policies cp
    JOIN public.compliance_areas ca ON lower(ca.name) = lower(cp.category)
    JOIN public.compliance_rules cr ON cr.area_id = ca.id
    WHERE cr.id = COALESCE(NEW.rule_id, OLD.rule_id)
  LOOP
    PERFORM public.recalc_policy_compliance_rate(r.id);
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_checks_recalc ON public.compliance_checks;
CREATE TRIGGER trg_checks_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.compliance_checks
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_on_check();

SELECT public.recalc_all_policy_compliance_rates();

CREATE OR REPLACE FUNCTION public.vendor_is_policy_compliant(_vendor_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.compliance_policies cp
    LEFT JOIN public.vendor_policy_submissions vps
      ON vps.policy_id = cp.id AND vps.vendor_id = _vendor_id
    WHERE cp.status = 'active'
      AND cp.vendor_requirement_mandatory = true
      AND cp.vendor_requirement_type <> 'none'
      AND (
        vps.id IS NULL OR vps.status <> 'approved'
        OR (vps.expires_at IS NOT NULL AND vps.expires_at <= now())
      )
  );
$$;

CREATE OR REPLACE VIEW public.vendor_compliance_overview AS
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
