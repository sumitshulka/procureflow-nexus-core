-- Create tax_codes table
CREATE TABLE IF NOT EXISTS public.tax_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  country VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tax_rates table (multiple rates can belong to one tax code)
CREATE TABLE IF NOT EXISTS public.tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_code_id UUID NOT NULL REFERENCES public.tax_codes(id) ON DELETE CASCADE,
  rate_name TEXT NOT NULL,
  rate_percentage NUMERIC(5,2) NOT NULL CHECK (rate_percentage >= 0 AND rate_percentage <= 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add tax_code_id to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS tax_code_id UUID REFERENCES public.tax_codes(id) ON DELETE SET NULL;

-- Add tax_code_id to purchase_order_items table
ALTER TABLE public.purchase_order_items 
ADD COLUMN IF NOT EXISTS tax_code_id UUID REFERENCES public.tax_codes(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tax_codes_active ON public.tax_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_tax_codes_country ON public.tax_codes(country);
CREATE INDEX IF NOT EXISTS idx_tax_rates_tax_code ON public.tax_rates(tax_code_id);
CREATE INDEX IF NOT EXISTS idx_products_tax_code ON public.products(tax_code_id);
CREATE INDEX IF NOT EXISTS idx_po_items_tax_code ON public.purchase_order_items(tax_code_id);

-- Enable RLS
ALTER TABLE public.tax_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tax_codes
CREATE POLICY "Authenticated users can view tax codes"
  ON public.tax_codes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage tax codes"
  ON public.tax_codes FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for tax_rates
CREATE POLICY "Authenticated users can view tax rates"
  ON public.tax_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage tax rates"
  ON public.tax_rates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tax_codes tc 
      WHERE tc.id = tax_rates.tax_code_id 
      AND has_role(auth.uid(), 'admin'::user_role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tax_codes tc 
      WHERE tc.id = tax_rates.tax_code_id 
      AND has_role(auth.uid(), 'admin'::user_role)
    )
  );

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_tax_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_tax_codes_updated_at
BEFORE UPDATE ON public.tax_codes
FOR EACH ROW
EXECUTE FUNCTION update_tax_codes_updated_at();