ALTER TABLE public.inventory_transactions
  ADD COLUMN IF NOT EXISTS warranty_start_date date,
  ADD COLUMN IF NOT EXISTS warranty_end_date date;