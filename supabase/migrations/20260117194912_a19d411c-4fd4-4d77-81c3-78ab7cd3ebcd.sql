-- Add parent_id column for head hierarchy (sub-heads)
ALTER TABLE public.budget_heads 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.budget_heads(id) ON DELETE SET NULL;

-- Add is_subhead column for easier querying
ALTER TABLE public.budget_heads 
ADD COLUMN IF NOT EXISTS is_subhead BOOLEAN DEFAULT false;

-- Create unique constraint on type + display_order to prevent duplicates
-- First, we need to handle any existing duplicates
-- Update display_order to be unique per type
WITH ranked AS (
  SELECT id, type, ROW_NUMBER() OVER (PARTITION BY type ORDER BY display_order, created_at) as new_order
  FROM budget_heads
)
UPDATE budget_heads 
SET display_order = ranked.new_order
FROM ranked
WHERE budget_heads.id = ranked.id;

-- Now create the unique constraint
ALTER TABLE public.budget_heads 
ADD CONSTRAINT budget_heads_type_display_order_unique UNIQUE (type, display_order);

-- Create index for parent_id lookups
CREATE INDEX IF NOT EXISTS idx_budget_heads_parent_id ON public.budget_heads(parent_id);

-- Create function to get next code for a type
CREATE OR REPLACE FUNCTION get_next_budget_head_code(head_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT;
  next_num INT;
  result TEXT;
BEGIN
  -- Set prefix based on type
  IF head_type = 'income' THEN
    prefix := 'INC';
  ELSE
    prefix := 'EXP';
  END IF;
  
  -- Get the highest number for this type
  SELECT COALESCE(MAX(
    CASE 
      WHEN code ~ ('^' || prefix || '[0-9]+$') 
      THEN CAST(SUBSTRING(code FROM LENGTH(prefix) + 1) AS INT)
      ELSE 0
    END
  ), 0) + 1 INTO next_num
  FROM budget_heads
  WHERE type = head_type;
  
  result := prefix || LPAD(next_num::TEXT, 3, '0');
  RETURN result;
END;
$$;

-- Create function to get next display order for a type
CREATE OR REPLACE FUNCTION get_next_budget_head_display_order(head_type TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_order INT;
BEGIN
  SELECT COALESCE(MAX(display_order), 0) + 1 INTO next_order
  FROM budget_heads
  WHERE type = head_type;
  
  RETURN next_order;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_next_budget_head_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_budget_head_display_order(TEXT) TO authenticated;