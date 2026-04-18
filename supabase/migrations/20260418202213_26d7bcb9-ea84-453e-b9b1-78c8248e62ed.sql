ALTER TABLE public.risk_assessments
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendor_registrations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS treatment_strategy text DEFAULT 'Treat' CHECK (treatment_strategy IN ('Treat','Transfer','Tolerate','Terminate')),
  ADD COLUMN IF NOT EXISTS residual_probability integer,
  ADD COLUMN IF NOT EXISTS residual_impact integer,
  ADD COLUMN IF NOT EXISTS residual_score integer,
  ADD COLUMN IF NOT EXISTS review_frequency_days integer DEFAULT 90,
  ADD COLUMN IF NOT EXISTS next_review_date date,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalated_by uuid,
  ADD COLUMN IF NOT EXISTS auto_generated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_trigger text;

CREATE INDEX IF NOT EXISTS idx_risk_assessments_vendor ON public.risk_assessments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_department ON public.risk_assessments(department_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_entity ON public.risk_assessments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_next_review ON public.risk_assessments(next_review_date) WHERE status NOT IN ('Closed','Accepted');

CREATE TABLE IF NOT EXISTS public.risk_appetite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.risk_categories(id) ON DELETE CASCADE,
  appetite_level text NOT NULL DEFAULT 'Moderate' CHECK (appetite_level IN ('Averse','Minimal','Cautious','Moderate','Open','Hungry')),
  low_threshold integer NOT NULL DEFAULT 6,
  medium_threshold integer NOT NULL DEFAULT 12,
  high_threshold integer NOT NULL DEFAULT 18,
  critical_threshold integer NOT NULL DEFAULT 20,
  tolerance_statement text,
  escalation_score integer NOT NULL DEFAULT 18,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE(category_id)
);

ALTER TABLE public.risk_appetite ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view risk appetite"
  ON public.risk_appetite FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can insert risk appetite"
  ON public.risk_appetite FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update risk appetite"
  ON public.risk_appetite FOR UPDATE
  TO authenticated USING (public.is_admin());

CREATE POLICY "Admins can delete risk appetite"
  ON public.risk_appetite FOR DELETE
  TO authenticated USING (public.is_admin());

CREATE TRIGGER update_risk_appetite_updated_at
  BEFORE UPDATE ON public.risk_appetite
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.risk_assessment_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escalation_score integer;
BEGIN
  IF NEW.residual_probability IS NOT NULL AND NEW.residual_impact IS NOT NULL THEN
    NEW.residual_score := NEW.residual_probability * NEW.residual_impact;
  END IF;

  IF NEW.next_review_date IS NULL AND NEW.review_frequency_days IS NOT NULL THEN
    NEW.next_review_date := (CURRENT_DATE + (NEW.review_frequency_days || ' days')::interval)::date;
  END IF;

  IF NEW.category_id IS NOT NULL AND NEW.risk_score IS NOT NULL THEN
    SELECT escalation_score INTO v_escalation_score
    FROM public.risk_appetite
    WHERE category_id = NEW.category_id AND is_active = true
    LIMIT 1;

    IF v_escalation_score IS NOT NULL AND NEW.risk_score >= v_escalation_score
       AND NEW.status NOT IN ('Closed','Accepted','Escalated') THEN
      NEW.status := 'Escalated';
      NEW.escalated_at := COALESCE(NEW.escalated_at, now());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_risk_lifecycle ON public.risk_assessments;
CREATE TRIGGER trg_risk_lifecycle
  BEFORE INSERT OR UPDATE ON public.risk_assessments
  FOR EACH ROW EXECUTE FUNCTION public.risk_assessment_lifecycle();

INSERT INTO public.risk_appetite (category_id, appetite_level, low_threshold, medium_threshold, high_threshold, critical_threshold, escalation_score, tolerance_statement)
SELECT id,
  CASE name
    WHEN 'Compliance' THEN 'Averse'
    WHEN 'Cybersecurity' THEN 'Minimal'
    WHEN 'Financial' THEN 'Cautious'
    WHEN 'Operational' THEN 'Moderate'
    WHEN 'Strategic' THEN 'Open'
    ELSE 'Moderate'
  END,
  6, 12, 18, 20,
  CASE name
    WHEN 'Compliance' THEN 12
    WHEN 'Cybersecurity' THEN 12
    ELSE 18
  END,
  'Default appetite — adjust to match your organization''s risk tolerance statement.'
FROM public.risk_categories
WHERE NOT EXISTS (SELECT 1 FROM public.risk_appetite ra WHERE ra.category_id = risk_categories.id);