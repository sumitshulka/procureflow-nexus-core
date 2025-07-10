-- Fix the ambiguous vendor_number reference in the trigger function
DROP FUNCTION IF EXISTS public.assign_vendor_number_on_approval();

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

-- Re-create the trigger
DROP TRIGGER IF EXISTS vendor_number_assignment_trigger ON public.vendor_registrations;
CREATE TRIGGER vendor_number_assignment_trigger
    BEFORE UPDATE ON public.vendor_registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_vendor_number_on_approval();