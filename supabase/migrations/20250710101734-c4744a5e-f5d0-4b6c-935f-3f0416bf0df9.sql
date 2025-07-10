-- Fix the generate_vendor_number function to avoid column name ambiguity
DROP FUNCTION IF EXISTS public.generate_vendor_number() CASCADE;

CREATE OR REPLACE FUNCTION public.generate_vendor_number()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    sequence_number INTEGER;
    new_vendor_number TEXT;
BEGIN
    -- Get current year
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get the next sequence number for this year
    -- Use explicit table reference to avoid ambiguity
    SELECT COALESCE(MAX(CAST(SUBSTRING(vr.vendor_number FROM 9) AS INTEGER)), 0) + 1
    INTO sequence_number
    FROM public.vendor_registrations vr
    WHERE vr.vendor_number LIKE 'VN-' || current_year || '-%'
    AND vr.vendor_number IS NOT NULL;
    
    -- Format: VN-YYYY-NNNN (e.g., VN-2025-0001)
    new_vendor_number := 'VN-' || current_year || '-' || LPAD(sequence_number::TEXT, 4, '0');
    
    RETURN new_vendor_number;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger function and trigger
DROP TRIGGER IF EXISTS trigger_assign_vendor_number ON public.vendor_registrations;
DROP FUNCTION IF EXISTS public.assign_vendor_number_on_approval() CASCADE;

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

-- Create the trigger
CREATE TRIGGER trigger_assign_vendor_number
    BEFORE UPDATE ON public.vendor_registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_vendor_number_on_approval();