
-- Fix the timestamp type issue in the delivery details function
CREATE OR REPLACE FUNCTION public.update_transaction_delivery_details(transaction_id uuid, details jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result jsonb;
BEGIN
  -- Update the transaction with delivery details and mark as delivered
  -- Use NOW() directly instead of storing it in a variable
  UPDATE public.inventory_transactions
  SET 
    delivery_details = details,
    delivery_status = 'delivered',
    updated_at = NOW()
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
    'target_warehouse_id', target_warehouse_id,
    'updated_at', updated_at
  ) INTO result;
  
  IF result IS NULL THEN
    RAISE EXCEPTION 'Transaction with id % not found', transaction_id;
  END IF;
  
  RETURN result;
END;
$function$;
