
-- Fix the delivery details function to ensure it doesn't reference updated_at
CREATE OR REPLACE FUNCTION public.update_transaction_delivery_details(transaction_id uuid, details jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result jsonb;
BEGIN
  -- Update the transaction without trying to set updated_at (which doesn't exist)
  UPDATE public.inventory_transactions
  SET 
    delivery_details = details,
    delivery_status = 'delivered'
  WHERE id = transaction_id
  RETURNING jsonb_build_object(
    'id', id,
    'delivery_details', delivery_details,
    'delivery_status', delivery_status,
    'type', type,
    'product_id', product_id,
    'quantity', quantity,
    'source_warehouse_id', source_warehouse_id,
    'transaction_date', transaction_date,
    'user_id', user_id,
    'approval_status', approval_status,
    'request_id', request_id,
    'reference', reference,
    'notes', notes,
    'target_warehouse_id', target_warehouse_id
  ) INTO result;
  
  RETURN result;
END;
$function$;
