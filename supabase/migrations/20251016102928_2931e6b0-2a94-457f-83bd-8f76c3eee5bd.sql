-- Add missing foreign key constraints to budget_allocations table
-- Only add if they don't already exist

DO $$ 
BEGIN
  -- Add cycle_id foreign key if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'budget_allocations_cycle_id_fkey'
    AND table_name = 'budget_allocations'
  ) THEN
    ALTER TABLE public.budget_allocations
    ADD CONSTRAINT budget_allocations_cycle_id_fkey 
    FOREIGN KEY (cycle_id) REFERENCES public.budget_cycles(id) ON DELETE CASCADE;
  END IF;

  -- Add head_id foreign key if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'budget_allocations_head_id_fkey'
    AND table_name = 'budget_allocations'
  ) THEN
    ALTER TABLE public.budget_allocations
    ADD CONSTRAINT budget_allocations_head_id_fkey 
    FOREIGN KEY (head_id) REFERENCES public.budget_heads(id) ON DELETE CASCADE;
  END IF;

  -- Add department_id foreign key if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'budget_allocations_department_id_fkey'
    AND table_name = 'budget_allocations'
  ) THEN
    ALTER TABLE public.budget_allocations
    ADD CONSTRAINT budget_allocations_department_id_fkey 
    FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;
  END IF;

  -- Add reviewed_by foreign key if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'budget_allocations_reviewed_by_fkey'
    AND table_name = 'budget_allocations'
  ) THEN
    ALTER TABLE public.budget_allocations
    ADD CONSTRAINT budget_allocations_reviewed_by_fkey 
    FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;