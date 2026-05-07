ALTER TABLE public.approval_hierarchies ALTER COLUMN department_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS approval_hierarchies_global_level_uidx
  ON public.approval_hierarchies(approver_level)
  WHERE department_id IS NULL;