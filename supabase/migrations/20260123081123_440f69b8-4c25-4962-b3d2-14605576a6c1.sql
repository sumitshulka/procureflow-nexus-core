
-- Change display_order from integer to numeric to support decimal values for sub-heads
-- Sub-heads use display_order like 1.1, 1.2, etc. (parent.sub_order format)

ALTER TABLE public.budget_heads 
ALTER COLUMN display_order TYPE numeric USING display_order::numeric;

-- Add a comment explaining the format
COMMENT ON COLUMN public.budget_heads.display_order IS 'Display order for budget heads. Main heads use whole numbers (1, 2, 3). Sub-heads use decimal format (1.1, 1.2) where the integer part matches the parent.';
