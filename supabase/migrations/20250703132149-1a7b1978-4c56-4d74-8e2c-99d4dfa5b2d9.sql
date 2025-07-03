-- Add vendor_number column to vendor_registrations table
ALTER TABLE public.vendor_registrations ADD COLUMN vendor_number VARCHAR(20) UNIQUE;

-- Create function to generate vendor number
CREATE OR REPLACE FUNCTION public.generate_vendor_number()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    sequence_number INTEGER;
    vendor_number TEXT;
BEGIN
    -- Get current year
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get the next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(vendor_number FROM 9) AS INTEGER)), 0) + 1
    INTO sequence_number
    FROM public.vendor_registrations
    WHERE vendor_number LIKE 'VN-' || current_year || '-%'
    AND vendor_number IS NOT NULL;
    
    -- Format: VN-YYYY-NNNN (e.g., VN-2025-0001)
    vendor_number := 'VN-' || current_year || '-' || LPAD(sequence_number::TEXT, 4, '0');
    
    RETURN vendor_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to auto-generate vendor number on approval
CREATE OR REPLACE FUNCTION public.assign_vendor_number_on_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changed to approved and vendor_number is null, generate one
    IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.vendor_number IS NULL THEN
        NEW.vendor_number := public.generate_vendor_number();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign vendor number when vendor is approved
CREATE TRIGGER trigger_assign_vendor_number
    BEFORE UPDATE ON public.vendor_registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_vendor_number_on_approval();

-- Update existing approved vendors without vendor numbers (if any)
UPDATE public.vendor_registrations 
SET vendor_number = public.generate_vendor_number()
WHERE status = 'approved' AND vendor_number IS NULL;