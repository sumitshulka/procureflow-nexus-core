-- Create tax_types table
CREATE TABLE IF NOT EXISTS public.tax_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    country VARCHAR,
    applicability_rules JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add tax_type_id to tax_codes
ALTER TABLE public.tax_codes
ADD COLUMN IF NOT EXISTS tax_type_id UUID REFERENCES public.tax_types(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tax_codes_tax_type_id ON public.tax_codes(tax_type_id);

-- Enable RLS on tax_types
ALTER TABLE public.tax_types ENABLE ROW LEVEL SECURITY;

-- RLS policies for tax_types
CREATE POLICY "Authenticated users can view tax types"
ON public.tax_types FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage tax types"
ON public.tax_types FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_tax_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_tax_types_updated_at_trigger
BEFORE UPDATE ON public.tax_types
FOR EACH ROW
EXECUTE FUNCTION public.update_tax_types_updated_at();

-- Drop and recreate the get_applicable_tax_code function with new return type
DROP FUNCTION IF EXISTS public.get_applicable_tax_code(UUID, VARCHAR);

CREATE FUNCTION public.get_applicable_tax_code(
  p_vendor_id UUID,
  p_buyer_state VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  tax_code_id UUID,
  tax_code VARCHAR,
  tax_name TEXT,
  total_rate NUMERIC,
  rates JSONB,
  tax_type_code VARCHAR,
  tax_type_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_state VARCHAR;
  v_org_state VARCHAR;
BEGIN
  -- Get vendor state from their registered address
  SELECT 
    COALESCE(
      (registered_address->>'state')::VARCHAR,
      (business_address->>'state')::VARCHAR
    )
  INTO v_vendor_state
  FROM vendor_registrations
  WHERE id = p_vendor_id;
  
  -- Get organization state
  IF p_buyer_state IS NOT NULL THEN
    v_org_state := p_buyer_state;
  ELSE
    SELECT 
      COALESCE(
        (SELECT state FROM locations WHERE is_active = true ORDER BY created_at LIMIT 1),
        'Unknown'
      )
    INTO v_org_state;
  END IF;
  
  -- Return applicable tax codes based on conditions and tax type rules
  RETURN QUERY
  SELECT 
    tc.id as tax_code_id,
    tc.code as tax_code,
    tc.name as tax_name,
    COALESCE(SUM(tr.rate_percentage), 0) as total_rate,
    jsonb_agg(
      jsonb_build_object(
        'id', tr.id,
        'rate_name', tr.rate_name,
        'rate_percentage', tr.rate_percentage
      ) ORDER BY tr.rate_name
    ) as rates,
    tt.code as tax_type_code,
    tt.name as tax_type_name
  FROM tax_codes tc
  LEFT JOIN tax_types tt ON tt.id = tc.tax_type_id
  LEFT JOIN tax_rates tr ON tr.tax_code_id = tc.id AND tr.is_active = true
  WHERE tc.is_active = true
    AND (
      -- Tax code level conditions (backward compatibility)
      tc.applicability_condition = 'always'
      OR tc.applicability_condition IS NULL
      OR (tc.applicability_condition = 'same_state' AND v_vendor_state = v_org_state)
      OR (tc.applicability_condition = 'different_state' AND v_vendor_state != v_org_state)
      OR (tc.applicability_condition = 'international' 
          AND (v_vendor_state IS NULL OR v_org_state IS NULL OR v_vendor_state = 'International'))
    )
  GROUP BY tc.id, tc.code, tc.name, tt.code, tt.name
  ORDER BY 
    CASE tc.applicability_condition
      WHEN 'same_state' THEN 1
      WHEN 'different_state' THEN 2
      WHEN 'international' THEN 3
      ELSE 4
    END;
END;
$$;

COMMENT ON TABLE public.tax_types IS 'Tax type definitions with global applicability rules (e.g., GST, VAT, Sales Tax)';
COMMENT ON TABLE public.tax_codes IS 'Specific tax code implementations that belong to a tax type (e.g., IGST, CGST, SGST)';
COMMENT ON COLUMN public.tax_types.applicability_rules IS 'JSON array defining when tax codes of this type apply, e.g., [{"condition": "same_state", "applies_to": ["CGST", "SGST"]}, {"condition": "different_state", "applies_to": ["IGST"]}]';