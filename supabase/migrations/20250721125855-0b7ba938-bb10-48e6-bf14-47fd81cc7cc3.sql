-- Update rfp_addendums table to include field overrides
ALTER TABLE public.rfp_addendums 
ADD COLUMN field_overrides JSONB DEFAULT '{}';

-- Create rfp_activities table for timeline tracking
CREATE TABLE public.rfp_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfp_id UUID NOT NULL REFERENCES public.rfps(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'created', 'published', 'addendum_added', 'clarification_sent', 'response_received', etc.
  performed_by UUID NOT NULL,
  activity_data JSONB DEFAULT '{}', -- Additional context data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  title TEXT NOT NULL,
  description TEXT
);

-- Enable RLS on rfp_activities
ALTER TABLE public.rfp_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for rfp_activities
CREATE POLICY "Organization can view all RFP activities"
ON public.rfp_activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.rfps r 
    WHERE r.id = rfp_activities.rfp_id 
    AND r.created_by = auth.uid()
  ) 
  OR has_role(auth.uid(), 'admin') 
  OR has_role(auth.uid(), 'procurement_officer')
);

CREATE POLICY "Organization can insert RFP activities"
ON public.rfp_activities FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rfps r 
    WHERE r.id = rfp_activities.rfp_id 
    AND r.created_by = auth.uid()
  ) 
  OR has_role(auth.uid(), 'admin') 
  OR has_role(auth.uid(), 'procurement_officer')
);

-- Vendors can view relevant activities
CREATE POLICY "Vendors can view relevant RFP activities"
ON public.rfp_activities FOR SELECT
USING (
  activity_type IN ('published', 'addendum_added', 'clarification_answered')
  AND EXISTS (
    SELECT 1 FROM public.rfps r 
    WHERE r.id = rfp_activities.rfp_id 
    AND r.status = 'published'
  )
);

-- Function to get effective RFP data (original + addendum overrides)
CREATE OR REPLACE FUNCTION public.get_effective_rfp_data(p_rfp_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  base_rfp JSONB;
  addendum_overrides JSONB := '{}';
  addendum_record RECORD;
BEGIN
  -- Get base RFP data
  SELECT to_jsonb(rfps) INTO base_rfp
  FROM public.rfps
  WHERE id = p_rfp_id;
  
  IF base_rfp IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Apply addendum overrides in chronological order
  FOR addendum_record IN
    SELECT field_overrides, addendum_number
    FROM public.rfp_addendums
    WHERE rfp_id = p_rfp_id 
    AND is_published = true
    ORDER BY addendum_number ASC
  LOOP
    -- Merge field overrides
    addendum_overrides := addendum_overrides || addendum_record.field_overrides;
  END LOOP;
  
  -- Merge base RFP with all addendum overrides
  RETURN base_rfp || addendum_overrides;
END;
$$;

-- Function to log RFP activities
CREATE OR REPLACE FUNCTION public.log_rfp_activity(
  p_rfp_id UUID,
  p_activity_type TEXT,
  p_performed_by UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_activity_data JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO public.rfp_activities (
    rfp_id,
    activity_type,
    performed_by,
    title,
    description,
    activity_data
  ) VALUES (
    p_rfp_id,
    p_activity_type,
    p_performed_by,
    p_title,
    p_description,
    p_activity_data
  ) RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$;

-- Trigger to log RFP creation
CREATE OR REPLACE FUNCTION public.log_rfp_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_rfp_activity(
      NEW.id,
      'created',
      NEW.created_by,
      'RFP Created',
      'RFP ' || NEW.rfp_number || ' was created',
      jsonb_build_object('rfp_number', NEW.rfp_number)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'published' THEN
    PERFORM public.log_rfp_activity(
      NEW.id,
      'published',
      NEW.created_by,
      'RFP Published',
      'RFP ' || NEW.rfp_number || ' was published',
      jsonb_build_object('rfp_number', NEW.rfp_number)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for RFP activity logging
DROP TRIGGER IF EXISTS rfp_activity_logger ON public.rfps;
CREATE TRIGGER rfp_activity_logger
  AFTER INSERT OR UPDATE ON public.rfps
  FOR EACH ROW
  EXECUTE FUNCTION public.log_rfp_creation();

-- Trigger to log addendum creation
CREATE OR REPLACE FUNCTION public.log_addendum_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  rfp_number TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT r.rfp_number INTO rfp_number
    FROM public.rfps r
    WHERE r.id = NEW.rfp_id;
    
    PERFORM public.log_rfp_activity(
      NEW.rfp_id,
      'addendum_added',
      NEW.created_by,
      'Addendum #' || NEW.addendum_number || ' Added',
      'Addendum #' || NEW.addendum_number || ' was added to RFP ' || rfp_number,
      jsonb_build_object(
        'addendum_number', NEW.addendum_number,
        'addendum_title', NEW.title,
        'field_overrides', NEW.field_overrides
      )
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.is_published = false AND NEW.is_published = true THEN
    SELECT r.rfp_number INTO rfp_number
    FROM public.rfps r
    WHERE r.id = NEW.rfp_id;
    
    PERFORM public.log_rfp_activity(
      NEW.rfp_id,
      'addendum_published',
      NEW.created_by,
      'Addendum #' || NEW.addendum_number || ' Published',
      'Addendum #' || NEW.addendum_number || ' was published for RFP ' || rfp_number,
      jsonb_build_object(
        'addendum_number', NEW.addendum_number,
        'addendum_title', NEW.title
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for addendum activity logging
DROP TRIGGER IF EXISTS addendum_activity_logger ON public.rfp_addendums;
CREATE TRIGGER addendum_activity_logger
  AFTER INSERT OR UPDATE ON public.rfp_addendums
  FOR EACH ROW
  EXECUTE FUNCTION public.log_addendum_creation();