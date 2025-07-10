-- Fix the ambiguous vendor_number reference by recreating the trigger and function
-- First drop the existing trigger
DROP TRIGGER IF EXISTS trigger_assign_vendor_number ON public.vendor_registrations;

-- Then drop and recreate the function
DROP FUNCTION IF EXISTS public.assign_vendor_number_on_approval() CASCADE;

CREATE OR REPLACE FUNCTION public.assign_vendor_number_on_approval()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- If status changed to approved and vendor_number is null, generate one
    IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.vendor_number IS NULL THEN
        NEW.vendor_number := public.generate_vendor_number();
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Re-create the trigger with the correct name
CREATE TRIGGER trigger_assign_vendor_number
    BEFORE UPDATE ON public.vendor_registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_vendor_number_on_approval();