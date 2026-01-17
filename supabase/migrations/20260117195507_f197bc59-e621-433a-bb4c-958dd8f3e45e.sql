-- Drop the existing function first since return type is changing
DROP FUNCTION IF EXISTS get_next_budget_head_display_order(TEXT);

-- Update function to get next display order for main heads only
CREATE OR REPLACE FUNCTION get_next_budget_head_display_order(head_type TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_order NUMERIC;
BEGIN
  -- Get the next whole number for main heads (non-subheads)
  SELECT COALESCE(MAX(FLOOR(display_order)), 0) + 1 INTO next_order
  FROM budget_heads
  WHERE type = head_type
    AND is_subhead = false;
  
  RETURN next_order;
END;
$$;

-- New function to get next sub-item display order under a parent
CREATE OR REPLACE FUNCTION get_next_subhead_display_order(parent_head_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_order NUMERIC;
  max_decimal NUMERIC;
  next_order NUMERIC;
BEGIN
  -- Get parent's display order
  SELECT display_order INTO parent_order
  FROM budget_heads
  WHERE id = parent_head_id;
  
  IF parent_order IS NULL THEN
    RAISE EXCEPTION 'Parent head not found';
  END IF;
  
  -- Get the highest decimal used under this parent
  SELECT COALESCE(MAX(display_order - FLOOR(display_order)), 0) INTO max_decimal
  FROM budget_heads
  WHERE parent_id = parent_head_id;
  
  -- Calculate next order (parent + next decimal increment)
  next_order := FLOOR(parent_order) + ROUND(max_decimal + 0.1, 1);
  
  -- Ensure we don't exceed x.9
  IF next_order - FLOOR(parent_order) >= 1 THEN
    RAISE EXCEPTION 'Maximum sub-heads (9) reached for this parent';
  END IF;
  
  RETURN next_order;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_next_budget_head_display_order(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_subhead_display_order(UUID) TO authenticated;