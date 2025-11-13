-- Create a function to preview the next PO number without consuming it
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
    SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 8) AS INTEGER)), 0) + 1
    INTO sequence_number
    FROM purchase_orders
    WHERE po_number LIKE 'PO-' || year_part || '-%';
    
    -- Format the next PO number
    next_number := 'PO-' || year_part || '-' || LPAD(sequence_number::TEXT, 4, '0');
    
    RETURN next_number;
END;
$$;