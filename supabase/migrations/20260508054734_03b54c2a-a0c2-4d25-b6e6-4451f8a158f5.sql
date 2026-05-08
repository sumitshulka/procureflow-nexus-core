ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS warranty_covered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS warranty_period_months integer;

ALTER TABLE public.products
  ADD CONSTRAINT products_warranty_period_check
  CHECK (warranty_period_months IS NULL OR warranty_period_months > 0);