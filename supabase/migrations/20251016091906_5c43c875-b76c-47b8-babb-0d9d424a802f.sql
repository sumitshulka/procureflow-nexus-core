-- Add type column to budget_heads table
ALTER TABLE public.budget_heads 
ADD COLUMN type TEXT NOT NULL DEFAULT 'expenditure' CHECK (type IN ('income', 'expenditure'));