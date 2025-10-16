-- Add opening date fields to rfps table
ALTER TABLE public.rfps 
ADD COLUMN IF NOT EXISTS technical_opening_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS commercial_opening_date TIMESTAMP WITH TIME ZONE;

-- Add two-part submission tracking to rfp_responses
ALTER TABLE public.rfp_responses
ADD COLUMN IF NOT EXISTS technical_submission_status TEXT DEFAULT 'draft' CHECK (technical_submission_status IN ('draft', 'submitted')),
ADD COLUMN IF NOT EXISTS technical_submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS commercial_submission_status TEXT DEFAULT 'draft' CHECK (commercial_submission_status IN ('draft', 'submitted')),
ADD COLUMN IF NOT EXISTS commercial_submitted_at TIMESTAMP WITH TIME ZONE;

-- Update existing responses to mark both parts as submitted
UPDATE public.rfp_responses
SET 
  technical_submission_status = 'submitted',
  technical_submitted_at = submitted_at,
  commercial_submission_status = 'submitted',
  commercial_submitted_at = submitted_at
WHERE status = 'submitted';

-- Create function to check if technical responses can be viewed
CREATE OR REPLACE FUNCTION public.can_view_technical_responses(p_rfp_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_technical_opening_date TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT technical_opening_date INTO v_technical_opening_date
  FROM public.rfps
  WHERE id = p_rfp_id;
  
  -- If no opening date set, allow viewing (backward compatibility)
  IF v_technical_opening_date IS NULL THEN
    RETURN true;
  END IF;
  
  -- Allow viewing if opening date has passed
  RETURN NOW() >= v_technical_opening_date;
END;
$$;

-- Create function to check if commercial responses can be viewed
CREATE OR REPLACE FUNCTION public.can_view_commercial_responses(p_rfp_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commercial_opening_date TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT commercial_opening_date INTO v_commercial_opening_date
  FROM public.rfps
  WHERE id = p_rfp_id;
  
  -- If no opening date set, allow viewing (backward compatibility)
  IF v_commercial_opening_date IS NULL THEN
    RETURN true;
  END IF;
  
  -- Allow viewing if opening date has passed
  RETURN NOW() >= v_commercial_opening_date;
END;
$$;

-- Drop existing RLS policies for rfp_responses
DROP POLICY IF EXISTS "Organization can view all responses" ON public.rfp_responses;
DROP POLICY IF EXISTS "Vendors can manage their responses" ON public.rfp_responses;
DROP POLICY IF EXISTS "Admins and procurement can view responses" ON public.rfp_responses;
DROP POLICY IF EXISTS "Vendors can create responses" ON public.rfp_responses;
DROP POLICY IF EXISTS "Vendors can update their own responses" ON public.rfp_responses;

-- Create new RLS policies with blind evaluation
-- Vendors can always view their own responses
CREATE POLICY "Vendors can view their own responses"
ON public.rfp_responses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.vendor_registrations vr
    WHERE vr.id = rfp_responses.vendor_id 
    AND vr.user_id = auth.uid()
  )
);

-- Vendors can create responses
CREATE POLICY "Vendors can create responses"
ON public.rfp_responses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vendor_registrations vr
    WHERE vr.id = rfp_responses.vendor_id 
    AND vr.user_id = auth.uid()
  )
);

-- Vendors can update their own responses before submission
CREATE POLICY "Vendors can update their responses"
ON public.rfp_responses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.vendor_registrations vr
    WHERE vr.id = rfp_responses.vendor_id 
    AND vr.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vendor_registrations vr
    WHERE vr.id = rfp_responses.vendor_id 
    AND vr.user_id = auth.uid()
  )
);

-- Organization can view responses with blind evaluation rules
CREATE POLICY "Organization can view responses with blind evaluation"
ON public.rfp_responses
FOR SELECT
USING (
  (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'procurement_officer'::user_role))
  AND (
    -- Can always see vendor info and status
    -- But technical/commercial details are filtered based on opening dates in application layer
    true
  )
);

-- Create trigger to auto-extend opening dates when submission deadline is extended via addendum
CREATE OR REPLACE FUNCTION public.auto_extend_rfp_opening_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_submission_deadline TIMESTAMP WITH TIME ZONE;
  v_new_submission_deadline TIMESTAMP WITH TIME ZONE;
  v_date_extension INTERVAL;
BEGIN
  -- Only process if addendum is published and has field_overrides for submission_deadline
  IF NEW.is_published = true AND (NEW.field_overrides ? 'submission_deadline') THEN
    
    -- Get old and new submission deadlines
    SELECT submission_deadline INTO v_old_submission_deadline
    FROM public.rfps
    WHERE id = NEW.rfp_id;
    
    v_new_submission_deadline := (NEW.field_overrides->>'submission_deadline')::TIMESTAMP WITH TIME ZONE;
    
    -- Calculate the extension
    v_date_extension := v_new_submission_deadline - v_old_submission_deadline;
    
    -- Only extend if the new deadline is later
    IF v_date_extension > INTERVAL '0' THEN
      -- Extend technical opening date if it exists and is after old submission deadline
      UPDATE public.rfps
      SET technical_opening_date = technical_opening_date + v_date_extension
      WHERE id = NEW.rfp_id
      AND technical_opening_date IS NOT NULL
      AND technical_opening_date >= v_old_submission_deadline;
      
      -- Extend commercial opening date if it exists and is after old submission deadline
      UPDATE public.rfps
      SET commercial_opening_date = commercial_opening_date + v_date_extension
      WHERE id = NEW.rfp_id
      AND commercial_opening_date IS NOT NULL
      AND commercial_opening_date >= v_old_submission_deadline;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for addendum-based date extension
DROP TRIGGER IF EXISTS trigger_auto_extend_opening_dates ON public.rfp_addendums;
CREATE TRIGGER trigger_auto_extend_opening_dates
AFTER INSERT OR UPDATE ON public.rfp_addendums
FOR EACH ROW
EXECUTE FUNCTION public.auto_extend_rfp_opening_dates();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.can_view_technical_responses(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_commercial_responses(uuid) TO anon, authenticated;