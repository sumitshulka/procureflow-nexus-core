-- Fix the get_next_po_number function to start sequence from 0001
DROP FUNCTION IF EXISTS public.get_next_po_number();

CREATE OR REPLACE FUNCTION public.get_next_po_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    year_part TEXT;
    sequence_number INTEGER;
    next_number TEXT;
BEGIN
    year_part := to_char(CURRENT_DATE, 'YYYY');
    
    -- Get the next sequence number by looking at existing PO numbers for the current year
    -- SUBSTRING FROM 9 to skip 'PO-YYYY-' and get just the numeric part
    SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 9) AS INTEGER)), 0) + 1
    INTO sequence_number
    FROM purchase_orders
    WHERE po_number LIKE 'PO-' || year_part || '-%';
    
    -- Format the next PO number
    next_number := 'PO-' || year_part || '-' || LPAD(sequence_number::TEXT, 4, '0');
    
    RETURN next_number;
END;
$$;

-- Also fix the generate_po_number trigger function to be consistent
DROP FUNCTION IF EXISTS public.generate_po_number() CASCADE;

CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    year_part TEXT;
    sequence_number INTEGER;
    new_number TEXT;
BEGIN
    year_part := to_char(CURRENT_DATE, 'YYYY');
    
    -- SUBSTRING FROM 9 to get just the numeric sequence part
    SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 9) AS INTEGER)), 0) + 1
    INTO sequence_number
    FROM purchase_orders
    WHERE po_number LIKE 'PO-' || year_part || '-%';
    
    new_number := 'PO-' || year_part || '-' || LPAD(sequence_number::TEXT, 4, '0');
    NEW.po_number := new_number;
    
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER set_po_number_trigger
BEFORE INSERT ON purchase_orders
FOR EACH ROW
WHEN (NEW.po_number IS NULL)
EXECUTE FUNCTION generate_po_number();