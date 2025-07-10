-- Complete cleanup and fix for vendor_number ambiguity issue
-- Drop all existing triggers and functions related to vendor_number
DROP TRIGGER IF EXISTS trigger_assign_vendor_number ON public.vendor_registrations;
DROP TRIGGER IF EXISTS vendor_number_assignment_trigger ON public.vendor_registrations;
DROP FUNCTION IF EXISTS public.assign_vendor_number_on_approval() CASCADE;

-- Recreate the function with explicit table reference
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