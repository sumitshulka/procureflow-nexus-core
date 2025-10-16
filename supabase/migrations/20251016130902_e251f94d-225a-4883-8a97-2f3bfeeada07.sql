
-- Add column to allow department heads to create sub-items under a budget head
ALTER TABLE public.budget_heads
ADD COLUMN allow_department_subitems boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.budget_heads.allow_department_subitems IS 'Indicates if department heads can create sub-items under this budget head';
