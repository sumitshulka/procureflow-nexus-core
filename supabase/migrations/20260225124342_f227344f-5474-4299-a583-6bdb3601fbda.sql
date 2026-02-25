
-- ============================================================
-- 1. Add tracking fields to products table
-- ============================================================
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS tracking_type TEXT NOT NULL DEFAULT 'none' 
    CHECK (tracking_type IN ('none', 'batch', 'serial', 'batch_and_serial')),
  ADD COLUMN IF NOT EXISTS requires_serial_tracking BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 2. Product SKUs table (Product → SKU → Variants)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku_code TEXT NOT NULL,
  name TEXT NOT NULL,
  variant_attributes JSONB DEFAULT '{}'::jsonb,
  barcode TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(product_id, sku_code)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_product_skus_product_id ON public.product_skus(product_id);
CREATE INDEX IF NOT EXISTS idx_product_skus_sku_code ON public.product_skus(sku_code);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION public.update_product_skus_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_product_skus_updated_at ON public.product_skus;
CREATE TRIGGER trigger_update_product_skus_updated_at
  BEFORE UPDATE ON public.product_skus
  FOR EACH ROW EXECUTE FUNCTION public.update_product_skus_updated_at();

-- ============================================================
-- 3. Inventory Batches table (proper batch tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inventory_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id),
  sku_id UUID REFERENCES public.product_skus(id),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  batch_number TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC,
  currency TEXT DEFAULT 'USD',
  manufacturing_date DATE,
  expiry_date DATE,
  supplier_batch_ref TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'quarantine', 'depleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, warehouse_id, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_product ON public.inventory_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_warehouse ON public.inventory_batches(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry ON public.inventory_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_sku ON public.inventory_batches(sku_id);

DROP TRIGGER IF EXISTS trigger_update_inventory_batches_updated_at ON public.inventory_batches;
CREATE TRIGGER trigger_update_inventory_batches_updated_at
  BEFORE UPDATE ON public.inventory_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. Serial Numbers table (independent tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.serial_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id),
  sku_id UUID REFERENCES public.product_skus(id),
  serial_number TEXT NOT NULL,
  batch_id UUID REFERENCES public.inventory_batches(id),
  warehouse_id UUID REFERENCES public.warehouses(id),
  status TEXT NOT NULL DEFAULT 'in_stock' 
    CHECK (status IN ('in_stock', 'checked_out', 'in_transit', 'returned', 'defective', 'scrapped')),
  received_date TIMESTAMPTZ DEFAULT now(),
  received_transaction_id UUID REFERENCES public.inventory_transactions(id),
  checked_out_date TIMESTAMPTZ,
  checked_out_transaction_id UUID REFERENCES public.inventory_transactions(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, serial_number)
);

CREATE INDEX IF NOT EXISTS idx_serial_numbers_product ON public.serial_numbers(product_id);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_warehouse ON public.serial_numbers(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_status ON public.serial_numbers(status);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_batch ON public.serial_numbers(batch_id);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_serial ON public.serial_numbers(serial_number);

DROP TRIGGER IF EXISTS trigger_update_serial_numbers_updated_at ON public.serial_numbers;
CREATE TRIGGER trigger_update_serial_numbers_updated_at
  BEFORE UPDATE ON public.serial_numbers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. Add sku_id and batch_id references to inventory_transactions
-- ============================================================
ALTER TABLE public.inventory_transactions
  ADD COLUMN IF NOT EXISTS sku_id UUID REFERENCES public.product_skus(id),
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.inventory_batches(id),
  ADD COLUMN IF NOT EXISTS serial_numbers_data JSONB DEFAULT '[]'::jsonb;

-- ============================================================
-- 6. Add sku_id to inventory_items for SKU-level stock tracking
-- ============================================================
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS sku_id UUID REFERENCES public.product_skus(id);

-- ============================================================
-- 7. RLS Policies
-- ============================================================
ALTER TABLE public.product_skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serial_numbers ENABLE ROW LEVEL SECURITY;

-- Product SKUs - authenticated users can read, admins can modify
CREATE POLICY "Authenticated users can view product SKUs"
  ON public.product_skus FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage product SKUs"
  ON public.product_skus FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Inventory Batches - authenticated users can read, admins can modify
CREATE POLICY "Authenticated users can view inventory batches"
  ON public.inventory_batches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage inventory batches"
  ON public.inventory_batches FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Serial Numbers - authenticated users can read, admins can modify
CREATE POLICY "Authenticated users can view serial numbers"
  ON public.serial_numbers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage serial numbers"
  ON public.serial_numbers FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 8. FEFO helper function: get batches sorted by expiry
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_fefo_batches(
  p_product_id UUID,
  p_warehouse_id UUID,
  p_sku_id UUID DEFAULT NULL
)
RETURNS TABLE(
  batch_id UUID,
  batch_number TEXT,
  available_quantity NUMERIC,
  expiry_date DATE,
  unit_price NUMERIC,
  days_until_expiry INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ib.id AS batch_id,
    ib.batch_number,
    ib.quantity AS available_quantity,
    ib.expiry_date,
    ib.unit_price,
    CASE 
      WHEN ib.expiry_date IS NOT NULL THEN (ib.expiry_date - CURRENT_DATE)::INTEGER
      ELSE NULL
    END AS days_until_expiry
  FROM public.inventory_batches ib
  WHERE ib.product_id = p_product_id
    AND ib.warehouse_id = p_warehouse_id
    AND ib.quantity > 0
    AND ib.status = 'active'
    AND (p_sku_id IS NULL OR ib.sku_id = p_sku_id)
  ORDER BY 
    -- FEFO: items WITH expiry dates come first, sorted earliest first
    -- Items without expiry come last
    CASE WHEN ib.expiry_date IS NULL THEN 1 ELSE 0 END,
    ib.expiry_date ASC NULLS LAST,
    ib.created_at ASC;
END;
$$;
