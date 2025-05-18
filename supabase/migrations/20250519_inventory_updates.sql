
-- Function to update inventory quantities after checkout delivery
CREATE OR REPLACE FUNCTION public.update_inventory_after_checkout()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if this is an update to a check_out transaction setting delivery status to "delivered"
  IF NEW.type = 'check_out' AND NEW.delivery_status = 'delivered' AND 
     (OLD.delivery_status IS NULL OR OLD.delivery_status <> 'delivered') THEN
    
    -- Update inventory quantity by reducing from source warehouse
    UPDATE public.inventory_items
    SET 
      quantity = quantity - NEW.quantity,
      last_updated = NOW()
    WHERE 
      product_id = NEW.product_id AND
      warehouse_id = NEW.source_warehouse_id;
      
    -- Log the inventory update
    INSERT INTO public.activity_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      details
    ) VALUES (
      NEW.user_id,
      'inventory_reduction_after_checkout',
      'inventory_item',
      NEW.product_id,
      jsonb_build_object(
        'transaction_id', NEW.id,
        'quantity_reduced', NEW.quantity,
        'warehouse_id', NEW.source_warehouse_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the trigger for inventory updates
DROP TRIGGER IF EXISTS update_inventory_after_checkout_trigger ON public.inventory_transactions;
CREATE TRIGGER update_inventory_after_checkout_trigger
AFTER UPDATE ON public.inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_inventory_after_checkout();

-- Update the delivery details function to ensure it returns the complete JSON
CREATE OR REPLACE FUNCTION public.update_transaction_delivery_details(transaction_id uuid, details jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result jsonb;
BEGIN
  UPDATE public.inventory_transactions
  SET 
    delivery_details = details,
    delivery_status = 'delivered'
  WHERE id = transaction_id
  RETURNING to_jsonb(inventory_transactions) INTO result;
  
  RETURN result;
END;
$function$;
