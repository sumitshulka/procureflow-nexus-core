
INSERT INTO public.risk_categories (name, description, color, is_active) VALUES
  ('Cybersecurity', 'Information security, data protection, system breaches', '#E11D48', true),
  ('Strategic', 'Long-term business alignment, market positioning', '#7C3AED', true),
  ('Supply Chain', 'Logistics, inventory, supplier continuity', '#0EA5E9', true),
  ('ESG & Geopolitical', 'Environmental, social, governance, country/political risk', '#16A34A', true)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.risk_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category_name text NOT NULL,
  default_probability int NOT NULL DEFAULT 3 CHECK (default_probability BETWEEN 1 AND 5),
  default_impact int NOT NULL DEFAULT 3 CHECK (default_impact BETWEEN 1 AND 5),
  mitigation_strategy text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "library_read_authenticated" ON public.risk_library;
CREATE POLICY "library_read_authenticated" ON public.risk_library
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "library_admin_manage" ON public.risk_library;
CREATE POLICY "library_admin_manage" ON public.risk_library
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.snapshot_risk_metric()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR
     NEW.probability IS DISTINCT FROM OLD.probability OR
     NEW.impact IS DISTINCT FROM OLD.impact OR
     NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.risk_metrics (
      risk_id, metric_date, probability, impact, risk_score, mitigation_progress, notes, recorded_by
    ) VALUES (
      NEW.id, now(), NEW.probability, NEW.impact, NEW.risk_score,
      CASE WHEN NEW.status = 'Closed' THEN 100
           WHEN NEW.status = 'Mitigating' THEN 50
           ELSE 0 END,
      'Auto snapshot (' || TG_OP || ')',
      COALESCE(NEW.owner_id, NEW.created_by)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_risk_snapshot ON public.risk_assessments;
CREATE TRIGGER trg_risk_snapshot
AFTER INSERT OR UPDATE ON public.risk_assessments
FOR EACH ROW EXECUTE FUNCTION public.snapshot_risk_metric();

INSERT INTO public.risk_library (title, description, category_name, default_probability, default_impact, mitigation_strategy) VALUES
  ('Single source dependency', 'Critical category sourced from only one supplier, creating supply continuity exposure.', 'Supply Chain', 3, 5, 'Qualify at least one alternate supplier; maintain safety stock; create dual-sourcing plan.'),
  ('Vendor financial insolvency', 'Key vendor faces bankruptcy or liquidity issues impacting deliveries.', 'Vendor', 2, 5, 'Run quarterly financial health checks (D&B, credit reports); monitor payment behaviour; pre-qualify backups.'),
  ('Late or non-delivery of goods', 'Supplier fails to deliver on agreed timeline impacting operations.', 'Operational', 3, 4, 'Enforce SLA penalties; set up early-warning KPIs; maintain buffer inventory.'),
  ('Quality non-conformance', 'Goods received fail to meet specification leading to rejections and rework.', 'Operational', 3, 4, 'Mandatory incoming inspection; supplier quality audits; ISO 9001 prequalification.'),
  ('Price volatility / inflation', 'Sudden raw material or commodity price swings impact budgeted spend.', 'Financial', 4, 3, 'Use long-term contracts with price ceilings; hedge commodities; index-linked clauses.'),
  ('Currency / FX exposure', 'Adverse exchange-rate movement on cross-border purchases.', 'Financial', 3, 3, 'Forward contracts; multi-currency invoicing; natural hedging across imports/exports.'),
  ('Procurement fraud (kickbacks, collusion)', 'Buyer or vendor manipulates awards in exchange for personal benefit.', 'Compliance', 2, 5, 'Segregation of duties; rotate approvers; whistleblower channel; periodic forensic audit.'),
  ('Bid rigging / cartel behaviour', 'Vendors collude on pricing during tenders.', 'Compliance', 2, 4, 'Sealed-bid e-tender; rotate vendor pool; benchmark against market indices.'),
  ('Sanctions & trade-restriction breach', 'Engaging an OFAC/EU/UN-sanctioned entity exposes the company to legal penalties.', 'Compliance', 2, 5, 'Automated sanctions screening at vendor onboarding; periodic re-screening.'),
  ('Anti-bribery / FCPA violation', 'Improper payments to public officials by vendor or buyer.', 'Compliance', 2, 5, 'Vendor code of conduct sign-off; FCPA training; due diligence on third parties.'),
  ('Contract leakage (off-contract spend)', 'Buyers purchase outside negotiated agreements, losing discounts.', 'Financial', 4, 3, 'Catalogue-driven PR/PO; spend analytics; PO compliance KPI per department.'),
  ('Maverick spend by departments', 'Unauthorised purchases outside the procurement process.', 'Operational', 4, 3, 'Mandatory PR routing; approval matrix enforcement; user training.'),
  ('Cybersecurity breach via vendor', 'Third-party vendor access compromises company data or systems.', 'Cybersecurity', 3, 5, 'Vendor SOC 2 / ISO 27001 review; least-privilege access; periodic pen test.'),
  ('Data privacy / GDPR breach', 'Vendor mishandles personal data leading to regulatory fines.', 'Cybersecurity', 2, 5, 'Data Processing Agreements; data minimisation; periodic privacy audits.'),
  ('Counterfeit goods in supply chain', 'Receipt of fake or substandard parts that mimic genuine products.', 'Supply Chain', 2, 5, 'Authorised distributor list; serial-number verification; supplier traceability.'),
  ('Logistics & transportation disruption', 'Port congestion, carrier failure or fuel crisis delays shipments.', 'Supply Chain', 3, 4, 'Diversified carrier base; alternate routing; multi-modal options.'),
  ('Geopolitical / country risk', 'War, embargo, or political instability impacts source country.', 'ESG & Geopolitical', 2, 5, 'Country risk index monitoring; near-shoring strategy; contingency suppliers.'),
  ('Climate / natural disaster disruption', 'Floods, earthquakes or extreme weather halt supplier production.', 'ESG & Geopolitical', 2, 4, 'Supplier BCP review; geographic diversification; insurance.'),
  ('Modern slavery / labour rights breach', 'Vendor uses forced or child labour creating reputational and legal risk.', 'ESG & Geopolitical', 2, 5, 'Self-declaration; third-party social audits; SA8000 prequalification.'),
  ('Environmental non-compliance', 'Vendor pollutes or violates environmental regulations.', 'ESG & Geopolitical', 2, 4, 'ISO 14001 prequalification; site audits; sustainability KPIs.'),
  ('IP / confidentiality leakage', 'Sensitive designs or pricing data shared with competitors via vendor.', 'Strategic', 2, 5, 'Strong NDAs; need-to-know data sharing; watermarked documents.'),
  ('Vendor performance degradation', 'Service quality erodes over the contract life, missing KPIs.', 'Vendor', 3, 3, 'Quarterly business reviews; balanced scorecard; performance penalties.'),
  ('ERP / system integration failure', 'Procurement system outage halts PO/Invoice processing.', 'Technology', 2, 4, 'High-availability hosting; offline PR/PO fallback procedure; DR drills.'),
  ('Inaccurate spend data / poor visibility', 'Lack of clean spend taxonomy leads to missed savings.', 'Strategic', 3, 3, 'Spend cube refresh; standardised category tree; analytics dashboards.')
ON CONFLICT DO NOTHING;
