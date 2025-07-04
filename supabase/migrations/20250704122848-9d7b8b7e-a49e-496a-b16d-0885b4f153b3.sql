
-- Add vendor-specific pricing fields to vendor_products table
ALTER TABLE public.vendor_products 
ADD COLUMN vendor_price NUMERIC,
ADD COLUMN vendor_currency VARCHAR(10) DEFAULT 'USD',
ADD COLUMN price_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add index for better performance when querying vendor prices
CREATE INDEX idx_vendor_products_vendor_price ON public.vendor_products(vendor_id, vendor_price);

-- Add a trigger to update price_updated_at when vendor_price is modified
CREATE OR REPLACE FUNCTION update_vendor_product_price_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.vendor_price IS DISTINCT FROM NEW.vendor_price THEN
        NEW.price_updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vendor_product_price_timestamp
    BEFORE UPDATE ON public.vendor_products
    FOR EACH ROW
    EXECUTE FUNCTION update_vendor_product_price_timestamp();
