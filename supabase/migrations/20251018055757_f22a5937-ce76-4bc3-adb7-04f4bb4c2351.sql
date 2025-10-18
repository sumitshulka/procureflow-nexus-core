-- Enable technical scoring for RFPs
ALTER TABLE public.rfps 
ADD COLUMN IF NOT EXISTS enable_technical_scoring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS minimum_technical_score NUMERIC;

-- Add technical score tracking to rfp_responses
ALTER TABLE public.rfp_responses 
ADD COLUMN IF NOT EXISTS total_technical_score NUMERIC,
ADD COLUMN IF NOT EXISTS is_technically_qualified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS technical_score_approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS technical_score_approved_at TIMESTAMP WITH TIME ZONE;

-- Create scoring criteria table
CREATE TABLE IF NOT EXISTS public.rfp_scoring_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfp_id UUID NOT NULL REFERENCES public.rfps(id) ON DELETE CASCADE,
    criterion_name TEXT NOT NULL,
    criterion_type TEXT NOT NULL CHECK (criterion_type IN ('numerical', 'multiple_choice', 'yes_no')),
    max_points NUMERIC NOT NULL,
    is_required BOOLEAN DEFAULT true,
    requires_document BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create scoring options table
CREATE TABLE IF NOT EXISTS public.rfp_scoring_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    criteria_id UUID NOT NULL REFERENCES public.rfp_scoring_criteria(id) ON DELETE CASCADE,
    option_label TEXT NOT NULL,
    option_value TEXT,
    points NUMERIC NOT NULL,
    min_value NUMERIC,
    max_value NUMERIC,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create response scores table
CREATE TABLE IF NOT EXISTS public.rfp_response_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES public.rfp_responses(id) ON DELETE CASCADE,
    criteria_id UUID NOT NULL REFERENCES public.rfp_scoring_criteria(id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES public.rfp_scoring_options(id),
    submitted_value TEXT,
    uploaded_document_url TEXT,
    auto_calculated_score NUMERIC,
    manual_score NUMERIC,
    manual_override_reason TEXT,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(response_id, criteria_id)
);

-- Enable RLS
ALTER TABLE public.rfp_scoring_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfp_scoring_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfp_response_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rfp_scoring_criteria
CREATE POLICY "Organization can manage scoring criteria"
ON public.rfp_scoring_criteria FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.rfps r
        WHERE r.id = rfp_scoring_criteria.rfp_id
        AND (r.created_by = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'procurement_officer'))
    )
);

CREATE POLICY "Vendors can view criteria for published RFPs"
ON public.rfp_scoring_criteria FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.rfps r
        WHERE r.id = rfp_scoring_criteria.rfp_id
        AND r.status = 'published'
    )
);

-- RLS Policies for rfp_scoring_options
CREATE POLICY "Organization can manage scoring options"
ON public.rfp_scoring_options FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.rfp_scoring_criteria sc
        JOIN public.rfps r ON r.id = sc.rfp_id
        WHERE sc.id = rfp_scoring_options.criteria_id
        AND (r.created_by = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'procurement_officer'))
    )
);

CREATE POLICY "Vendors can view options for published RFPs (points hidden client-side)"
ON public.rfp_scoring_options FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.rfp_scoring_criteria sc
        JOIN public.rfps r ON r.id = sc.rfp_id
        WHERE sc.id = rfp_scoring_options.criteria_id
        AND r.status = 'published'
    )
);

-- RLS Policies for rfp_response_scores
CREATE POLICY "Vendors can manage their own response scores"
ON public.rfp_response_scores FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.rfp_responses rr
        WHERE rr.id = rfp_response_scores.response_id
        AND rr.vendor_id = auth.uid()
    )
);

CREATE POLICY "Organization can view/approve all response scores after technical opening"
ON public.rfp_response_scores FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.rfp_responses rr
        JOIN public.rfps r ON r.id = rr.rfp_id
        WHERE rr.id = rfp_response_scores.response_id
        AND (r.created_by = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'procurement_officer'))
        AND (r.technical_opening_date IS NULL OR now() >= r.technical_opening_date)
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rfp_scoring_criteria_rfp_id ON public.rfp_scoring_criteria(rfp_id);
CREATE INDEX IF NOT EXISTS idx_rfp_scoring_options_criteria_id ON public.rfp_scoring_options(criteria_id);
CREATE INDEX IF NOT EXISTS idx_rfp_response_scores_response_id ON public.rfp_response_scores(response_id);
CREATE INDEX IF NOT EXISTS idx_rfp_response_scores_criteria_id ON public.rfp_response_scores(criteria_id);

-- Function to calculate total technical score
CREATE OR REPLACE FUNCTION public.calculate_technical_score(p_response_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_score NUMERIC := 0;
BEGIN
    SELECT COALESCE(SUM(
        CASE 
            WHEN manual_score IS NOT NULL AND is_approved = true THEN manual_score
            ELSE auto_calculated_score
        END
    ), 0) INTO total_score
    FROM public.rfp_response_scores
    WHERE response_id = p_response_id;
    
    RETURN total_score;
END;
$$;

-- Trigger to update total technical score
CREATE OR REPLACE FUNCTION public.update_technical_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    calculated_score NUMERIC;
    min_score NUMERIC;
BEGIN
    -- Calculate total score
    calculated_score := public.calculate_technical_score(NEW.response_id);
    
    -- Get minimum score requirement
    SELECT r.minimum_technical_score INTO min_score
    FROM public.rfp_responses rr
    JOIN public.rfps r ON r.id = rr.rfp_id
    WHERE rr.id = NEW.response_id;
    
    -- Update response with calculated score
    UPDATE public.rfp_responses
    SET 
        total_technical_score = calculated_score,
        is_technically_qualified = (min_score IS NULL OR calculated_score >= min_score)
    WHERE id = NEW.response_id;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_technical_score
AFTER INSERT OR UPDATE ON public.rfp_response_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_technical_score();