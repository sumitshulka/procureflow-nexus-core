-- Add tax_elements to tax_types to define tax components and their applicability
ALTER TABLE tax_types 
ADD COLUMN tax_elements jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN tax_types.tax_elements IS 'Array of tax elements with their applicability conditions. Example: [{"name": "IGST", "applicability_condition": "inter_state"}, {"name": "SGST", "applicability_condition": "intra_state"}, {"name": "CGST", "applicability_condition": "intra_state"}]';

-- Remove applicability_condition from tax_codes as it should be inherited from tax_type
ALTER TABLE tax_codes 
DROP COLUMN IF EXISTS applicability_condition;

-- Update tax_rates table to link to tax element name
ALTER TABLE tax_rates
ADD COLUMN tax_element_name varchar;

COMMENT ON COLUMN tax_rates.tax_element_name IS 'Name of the tax element from tax_type.tax_elements (e.g., IGST, SGST, CGST)';

-- Update the get_applicable_tax_code function to work with the new structure
CREATE OR REPLACE FUNCTION get_applicable_tax_code(
  p_product_id uuid,
  p_buyer_location_id uuid DEFAULT NULL,
  p_seller_location_id uuid DEFAULT NULL
)
RETURNS TABLE (
  tax_code_id uuid,
  tax_code_code varchar,
  tax_code_name text,
  applicable_rates jsonb
) AS $$
DECLARE
  v_product_tax_code_id uuid;
  v_buyer_state varchar;
  v_seller_state varchar;
  v_buyer_country varchar;
  v_seller_country varchar;
  v_tax_type_id uuid;
  v_tax_elements jsonb;
  v_applicable_condition text;
BEGIN
  -- Get product's tax code
  SELECT tax_code_id INTO v_product_tax_code_id
  FROM products
  WHERE id = p_product_id;

  -- If no tax code assigned, return empty
  IF v_product_tax_code_id IS NULL THEN
    RETURN;
  END IF;

  -- Get tax type and its elements
  SELECT tc.tax_type_id, tt.tax_elements
  INTO v_tax_type_id, v_tax_elements
  FROM tax_codes tc
  LEFT JOIN tax_types tt ON tt.id = tc.tax_type_id
  WHERE tc.id = v_product_tax_code_id;

  -- If no tax type or no elements defined, return all rates
  IF v_tax_type_id IS NULL OR v_tax_elements IS NULL OR jsonb_array_length(v_tax_elements) = 0 THEN
    RETURN QUERY
    SELECT 
      tc.id,
      tc.code,
      tc.name,
      jsonb_agg(
        jsonb_build_object(
          'rate_name', tr.rate_name,
          'rate_percentage', tr.rate_percentage,
          'tax_element_name', tr.tax_element_name
        )
      ) as applicable_rates
    FROM tax_codes tc
    LEFT JOIN tax_rates tr ON tr.tax_code_id = tc.id AND tr.is_active = true
    WHERE tc.id = v_product_tax_code_id
    GROUP BY tc.id, tc.code, tc.name;
    RETURN;
  END IF;

  -- Get location details if provided
  IF p_buyer_location_id IS NOT NULL THEN
    SELECT state, country INTO v_buyer_state, v_buyer_country
    FROM locations
    WHERE id = p_buyer_location_id;
  END IF;

  IF p_seller_location_id IS NOT NULL THEN
    SELECT state, country INTO v_seller_state, v_seller_country
    FROM locations
    WHERE id = p_seller_location_id;
  END IF;

  -- Determine applicability condition
  IF v_buyer_country IS NULL OR v_seller_country IS NULL THEN
    v_applicable_condition := 'always';
  ELSIF v_buyer_country != v_seller_country THEN
    v_applicable_condition := 'international';
  ELSIF v_buyer_state IS NOT NULL AND v_seller_state IS NOT NULL THEN
    IF v_buyer_state = v_seller_state THEN
      v_applicable_condition := 'intra_state';
    ELSE
      v_applicable_condition := 'inter_state';
    END IF;
  ELSE
    v_applicable_condition := 'always';
  END IF;

  -- Return tax code with applicable rates based on tax elements
  RETURN QUERY
  SELECT 
    tc.id,
    tc.code,
    tc.name,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'rate_name', tr.rate_name,
          'rate_percentage', tr.rate_percentage,
          'tax_element_name', tr.tax_element_name,
          'applicability_condition', elem->>'applicability_condition'
        )
      )
      FROM tax_rates tr
      CROSS JOIN LATERAL jsonb_array_elements(v_tax_elements) elem
      WHERE tr.tax_code_id = tc.id 
        AND tr.is_active = true
        AND tr.tax_element_name = elem->>'name'
        AND (
          elem->>'applicability_condition' = 'always' 
          OR elem->>'applicability_condition' = v_applicable_condition
        )
    ) as applicable_rates
  FROM tax_codes tc
  WHERE tc.id = v_product_tax_code_id;

END;
$$ LANGUAGE plpgsql STABLE;