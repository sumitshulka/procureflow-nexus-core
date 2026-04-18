-- ============================================================
-- AUTO-TRIGGER ENGINE: Detects operational risks and auto-creates risk_assessments
-- ============================================================

CREATE OR REPLACE FUNCTION public.detect_and_create_risks()
RETURNS TABLE(action text, risk_title text, vendor_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_system_user uuid;
  v_vendor_cat uuid;
  v_compliance_cat uuid;
  v_operational_cat uuid;
  v_supply_cat uuid;
  v_total_spend numeric;
  rec record;
BEGIN
  -- Get a system user (any admin) for auto-generated record ownership
  SELECT ur.user_id INTO v_system_user
  FROM public.user_roles ur
  JOIN public.custom_roles cr ON cr.id = ur.role
  WHERE LOWER(cr.name) = 'admin'
  LIMIT 1;

  IF v_system_user IS NULL THEN
    SELECT id INTO v_system_user FROM public.profiles LIMIT 1;
  END IF;

  IF v_system_user IS NULL THEN
    RAISE NOTICE 'No system user available for auto-generated risks; skipping';
    RETURN;
  END IF;

  SELECT id INTO v_vendor_cat FROM public.risk_categories WHERE name = 'Vendor' LIMIT 1;
  SELECT id INTO v_compliance_cat FROM public.risk_categories WHERE name = 'Compliance' LIMIT 1;
  SELECT id INTO v_operational_cat FROM public.risk_categories WHERE name = 'Operational' LIMIT 1;
  SELECT id INTO v_supply_cat FROM public.risk_categories WHERE name = 'Supply Chain' LIMIT 1;

  -- ----------------------------------------------------------
  -- TRIGGER 1: Vendor Late Delivery Risk (rate > 30%, min 3 POs)
  -- ----------------------------------------------------------
  FOR rec IN
    SELECT
      vr.id AS v_id,
      vr.company_name,
      COUNT(po.id) AS total_pos,
      COUNT(*) FILTER (WHERE po.actual_delivery_date IS NOT NULL
                       AND po.expected_delivery_date IS NOT NULL
                       AND po.actual_delivery_date > po.expected_delivery_date) AS late_count,
      ROUND(
        (COUNT(*) FILTER (WHERE po.actual_delivery_date IS NOT NULL
                          AND po.expected_delivery_date IS NOT NULL
                          AND po.actual_delivery_date > po.expected_delivery_date)::numeric
         / NULLIF(COUNT(po.id), 0)) * 100, 1
      ) AS late_rate
    FROM public.vendor_registrations vr
    JOIN public.purchase_orders po ON po.vendor_id = vr.id
    WHERE vr.status = 'approved'
    GROUP BY vr.id, vr.company_name
    HAVING COUNT(po.id) >= 3
       AND (COUNT(*) FILTER (WHERE po.actual_delivery_date IS NOT NULL
                             AND po.expected_delivery_date IS NOT NULL
                             AND po.actual_delivery_date > po.expected_delivery_date)::numeric
            / NULLIF(COUNT(po.id), 0)) > 0.30
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.risk_assessments
      WHERE auto_generated = true
        AND source_trigger = 'late_delivery'
        AND vendor_id = rec.v_id
        AND status NOT IN ('Closed', 'Accepted')
    ) THEN
      INSERT INTO public.risk_assessments (
        title, description, category_id, vendor_id, probability, impact,
        treatment_strategy, status, owner_id, created_by,
        auto_generated, source_trigger
      ) VALUES (
        'Vendor Delivery Performance Risk: ' || rec.company_name,
        'Auto-detected: ' || rec.late_count || ' of ' || rec.total_pos
          || ' POs delivered late (' || rec.late_rate || '%). Exceeds 30% threshold.',
        v_vendor_cat, rec.v_id, 4, 3, 'Treat', 'Open',
        v_system_user, v_system_user, true, 'late_delivery'
      );
      action := 'created'; risk_title := 'Vendor Delivery Performance Risk: ' || rec.company_name; vendor_id := rec.v_id;
      RETURN NEXT;
    END IF;
  END LOOP;

  -- Auto-close late delivery risks when rate drops below 20%
  FOR rec IN
    SELECT ra.id, ra.vendor_id, ra.title
    FROM public.risk_assessments ra
    WHERE ra.auto_generated = true
      AND ra.source_trigger = 'late_delivery'
      AND ra.status NOT IN ('Closed', 'Accepted')
      AND NOT EXISTS (
        SELECT 1 FROM public.purchase_orders po
        WHERE po.vendor_id = ra.vendor_id
        GROUP BY po.vendor_id
        HAVING COUNT(*) >= 3
           AND (COUNT(*) FILTER (WHERE po.actual_delivery_date IS NOT NULL
                                 AND po.expected_delivery_date IS NOT NULL
                                 AND po.actual_delivery_date > po.expected_delivery_date)::numeric
                / NULLIF(COUNT(*), 0)) > 0.20
      )
  LOOP
    UPDATE public.risk_assessments
    SET status = 'Closed', mitigation_strategy = COALESCE(mitigation_strategy, '') || E'\n[Auto-closed: delivery performance recovered]'
    WHERE id = rec.id;
    action := 'closed'; risk_title := rec.title; vendor_id := rec.vendor_id;
    RETURN NEXT;
  END LOOP;

  -- ----------------------------------------------------------
  -- TRIGGER 2: Vendor Concentration Risk (single vendor > 30% of total spend)
  -- ----------------------------------------------------------
  SELECT COALESCE(SUM(final_amount), 0) INTO v_total_spend FROM public.purchase_orders;

  IF v_total_spend > 0 THEN
    FOR rec IN
      SELECT
        vr.id AS v_id,
        vr.company_name,
        COALESCE(SUM(po.final_amount), 0) AS vendor_spend,
        ROUND((COALESCE(SUM(po.final_amount), 0) / v_total_spend) * 100, 1) AS concentration_pct
      FROM public.vendor_registrations vr
      JOIN public.purchase_orders po ON po.vendor_id = vr.id
      WHERE vr.status = 'approved'
      GROUP BY vr.id, vr.company_name
      HAVING (COALESCE(SUM(po.final_amount), 0) / v_total_spend) > 0.30
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.risk_assessments
        WHERE auto_generated = true
          AND source_trigger = 'concentration'
          AND vendor_id = rec.v_id
          AND status NOT IN ('Closed', 'Accepted')
      ) THEN
        INSERT INTO public.risk_assessments (
          title, description, category_id, vendor_id, probability, impact,
          treatment_strategy, status, owner_id, created_by,
          auto_generated, source_trigger
        ) VALUES (
          'Vendor Concentration Risk: ' || rec.company_name,
          'Auto-detected: This vendor represents ' || rec.concentration_pct
            || '% of total procurement spend. Single-source dependency exceeds 30% threshold.',
          v_supply_cat, rec.v_id, 3, 4, 'Treat', 'Open',
          v_system_user, v_system_user, true, 'concentration'
        );
        action := 'created'; risk_title := 'Vendor Concentration Risk: ' || rec.company_name; vendor_id := rec.v_id;
        RETURN NEXT;
      END IF;
    END LOOP;
  END IF;

  -- ----------------------------------------------------------
  -- TRIGGER 3: Compliance Document Expiry (within 30 days or already expired)
  -- ----------------------------------------------------------
  FOR rec IN
    SELECT DISTINCT vcs.vendor_id AS v_id, vr.company_name
    FROM public.vendor_compliance_submissions vcs
    JOIN public.vendor_registrations vr ON vr.id = vcs.vendor_id
    WHERE vcs.expiry_date IS NOT NULL
      AND vcs.expiry_date <= (CURRENT_DATE + interval '30 days')
      AND vr.status = 'approved'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.risk_assessments
      WHERE auto_generated = true
        AND source_trigger = 'compliance_expiry'
        AND vendor_id = rec.v_id
        AND status NOT IN ('Closed', 'Accepted')
    ) THEN
      INSERT INTO public.risk_assessments (
        title, description, category_id, vendor_id, probability, impact,
        treatment_strategy, status, owner_id, created_by,
        auto_generated, source_trigger
      ) VALUES (
        'Compliance Document Expiry: ' || rec.company_name,
        'Auto-detected: One or more compliance documents are expired or expiring within 30 days. Renewal required to maintain vendor eligibility.',
        v_compliance_cat, rec.v_id, 4, 4, 'Treat', 'Open',
        v_system_user, v_system_user, true, 'compliance_expiry'
      );
      action := 'created'; risk_title := 'Compliance Document Expiry: ' || rec.company_name; vendor_id := rec.v_id;
      RETURN NEXT;
    END IF;
  END LOOP;

  RETURN;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Risk detection error: %', SQLERRM;
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.detect_and_create_risks() TO authenticated;

-- ============================================================
-- VENDOR RISK PROFILE VIEW (Hybrid Rollup per ISO 31000)
-- ============================================================

CREATE OR REPLACE VIEW public.vendor_risk_profile AS
WITH vendor_pos AS (
  SELECT
    vendor_id,
    COUNT(*) AS po_count,
    COALESCE(SUM(final_amount), 0) AS total_spend,
    COUNT(*) FILTER (WHERE actual_delivery_date IS NOT NULL
                     AND expected_delivery_date IS NOT NULL
                     AND actual_delivery_date > expected_delivery_date) AS late_count
  FROM public.purchase_orders
  WHERE vendor_id IS NOT NULL
  GROUP BY vendor_id
),
total_spend AS (
  SELECT COALESCE(SUM(final_amount), 0) AS sum_all FROM public.purchase_orders
),
vendor_risks_agg AS (
  SELECT
    vendor_id,
    COUNT(*) AS total_risks,
    COUNT(*) FILTER (WHERE status NOT IN ('Closed', 'Accepted')) AS active_risks,
    COUNT(*) FILTER (WHERE risk_level IN ('Critical', 'High') AND status NOT IN ('Closed', 'Accepted')) AS critical_risks,
    COUNT(*) FILTER (WHERE status = 'Escalated') AS escalated_risks,
    COUNT(*) FILTER (WHERE auto_generated = true AND status NOT IN ('Closed', 'Accepted')) AS auto_detected_risks,
    COALESCE(MAX(risk_score) FILTER (WHERE status NOT IN ('Closed', 'Accepted')), 0) AS max_risk_score,
    COALESCE(ROUND(AVG(risk_score) FILTER (WHERE status NOT IN ('Closed', 'Accepted'))), 0) AS avg_risk_score
  FROM public.risk_assessments
  WHERE vendor_id IS NOT NULL
  GROUP BY vendor_id
)
SELECT
  vr.id AS vendor_id,
  vr.company_name,
  vr.status AS vendor_status,
  COALESCE(vp.po_count, 0) AS po_count,
  COALESCE(vp.total_spend, 0) AS total_spend,
  COALESCE(vp.late_count, 0) AS late_deliveries,
  CASE WHEN COALESCE(vp.po_count, 0) > 0
    THEN ROUND((vp.late_count::numeric / vp.po_count) * 100, 1)
    ELSE 0 END AS late_delivery_rate,
  CASE WHEN ts.sum_all > 0
    THEN ROUND((COALESCE(vp.total_spend, 0) / ts.sum_all) * 100, 1)
    ELSE 0 END AS spend_concentration_pct,
  COALESCE(vra.total_risks, 0) AS total_risks,
  COALESCE(vra.active_risks, 0) AS active_risks,
  COALESCE(vra.critical_risks, 0) AS critical_risks,
  COALESCE(vra.escalated_risks, 0) AS escalated_risks,
  COALESCE(vra.auto_detected_risks, 0) AS auto_detected_risks,
  COALESCE(vra.max_risk_score, 0) AS max_risk_score,
  COALESCE(vra.avg_risk_score, 0) AS avg_risk_score,
  CASE
    WHEN COALESCE(vra.escalated_risks, 0) > 0 OR COALESCE(vra.max_risk_score, 0) >= 18 THEN 'Critical'
    WHEN COALESCE(vra.critical_risks, 0) > 0 OR COALESCE(vra.max_risk_score, 0) >= 12 THEN 'High'
    WHEN COALESCE(vra.active_risks, 0) > 0 OR COALESCE(vra.max_risk_score, 0) >= 6 THEN 'Medium'
    ELSE 'Low'
  END AS overall_risk_rating
FROM public.vendor_registrations vr
LEFT JOIN vendor_pos vp ON vp.vendor_id = vr.id
LEFT JOIN vendor_risks_agg vra ON vra.vendor_id = vr.id
CROSS JOIN total_spend ts
WHERE vr.status = 'approved';

GRANT SELECT ON public.vendor_risk_profile TO authenticated;