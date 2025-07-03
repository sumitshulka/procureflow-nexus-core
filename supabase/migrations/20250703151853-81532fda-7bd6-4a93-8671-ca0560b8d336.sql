-- Create vendor_products table for vendor product registrations
CREATE TABLE public.vendor_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL,
  product_id UUID NOT NULL,
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(vendor_id, product_id)
);

-- Add foreign key constraints
ALTER TABLE public.vendor_products 
ADD CONSTRAINT fk_vendor_products_vendor 
FOREIGN KEY (vendor_id) REFERENCES public.vendor_registrations(id) ON DELETE CASCADE;

ALTER TABLE public.vendor_products 
ADD CONSTRAINT fk_vendor_products_product 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.vendor_products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Vendors can view their own product registrations" 
ON public.vendor_products 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM vendor_registrations vr 
  WHERE vr.id = vendor_products.vendor_id 
  AND vr.user_id = auth.uid()
));

CREATE POLICY "Vendors can manage their own product registrations" 
ON public.vendor_products 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM vendor_registrations vr 
  WHERE vr.id = vendor_products.vendor_id 
  AND vr.user_id = auth.uid()
));

CREATE POLICY "Admins can view all vendor product registrations" 
ON public.vendor_products 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'procurement_officer'::user_role));

-- Create index for better performance
CREATE INDEX idx_vendor_products_vendor_id ON public.vendor_products(vendor_id);
CREATE INDEX idx_vendor_products_product_id ON public.vendor_products(product_id);