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
      risk_id,
      metric_date,
      probability,
      impact,
      mitigation_progress,
      notes,
      recorded_by
    ) VALUES (
      NEW.id,
      now(),
      NEW.probability,
      NEW.impact,
      CASE
        WHEN NEW.status = 'Closed' THEN 100
        WHEN NEW.status = 'Mitigating' THEN 50
        ELSE 0
      END,
      'Auto snapshot (' || TG_OP || ')',
      COALESCE(NEW.owner_id, NEW.created_by)
    );
  END IF;

  RETURN NEW;
END;
$$;