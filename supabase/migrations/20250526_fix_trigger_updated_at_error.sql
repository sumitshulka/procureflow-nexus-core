
-- Fix the trigger function that's causing the "updated_at" field error
-- The issue is in the update_inventory_after_checkout function

-- Drop and recreate the trigger function without the problematic updated_at reference
DROP TRIGGER IF EXISTS update_inventory_after_checkout_trigger ON public.inventory_transactions;
DROP FUNCTION IF EXISTS public.update_inventory_after_checkout();

-- Create the corrected inventory update function
CREATE OR REPLACE FUNCTION public.update_inventory_after_checkout()
RETURNS TRIGGER AS $$
DECLARE
  item_id uuid;
  item_quantity integer;
  log_details jsonb;
BEGIN
  -- Only proceed if this is an update to a check_out transaction setting delivery status to "delivered"
  IF NEW.type = 'check_out' AND NEW.delivery_status = 'delivered' AND 
     (OLD.delivery_status IS NULL OR OLD.delivery_status <> 'delivered') THEN
    
    -- Log that the trigger has fired
    RAISE LOG 'Inventory update trigger fired for transaction: %', NEW.id;
    
    -- Find the inventory item ID and current quantity
    SELECT id, quantity INTO item_id, item_quantity 
    FROM inventory_items 
    WHERE product_id = NEW.product_id AND warehouse_id = NEW.source_warehouse_id;
    
    IF item_id IS NULL THEN
      RAISE LOG 'No inventory item found for product % in warehouse %', NEW.product_id, NEW.source_warehouse_id;
      
      -- Log the error in activity_logs
      INSERT INTO public.activity_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        details
      ) VALUES (
        COALESCE(NEW.user_id, '00000000-0000-0000-0000-000000000000'::uuid),
        'inventory_reduction_error',
        'inventory_transaction',
        NEW.id,
        jsonb_build_object(
          'error', 'No inventory item found',
          'product_id', NEW.product_id,
          'source_warehouse_id', NEW.source_warehouse_id,
          'transaction_id', NEW.id
        )
      );
    ELSE
      -- Log the current values before update
      RAISE LOG 'Current inventory for item %: quantity=%, reducing by %', item_id, item_quantity, NEW.quantity;
      
      -- Update inventory quantity by reducing from source warehouse
      UPDATE public.inventory_items
      SET 
        quantity = GREATEST(0, quantity - NEW.quantity),
        last_updated = NOW()
      WHERE id = item_id;
      
      RAISE LOG 'Inventory reduced successfully for item: %', item_id;
      
      -- Build detailed log information
      log_details := jsonb_build_object(
        'transaction_id', NEW.id,
        'product_id', NEW.product_id,
        'quantity_reduced', NEW.quantity,
        'warehouse_id', NEW.source_warehouse_id,
        'inventory_item_id', item_id,
        'previous_quantity', item_quantity,
        'new_quantity', GREATEST(0, item_quantity - NEW.quantity),
        'trigger_time', NOW()
      );
      
      -- Log the inventory update
      INSERT INTO public.activity_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        details
      ) VALUES (
        COALESCE(NEW.user_id, '00000000-0000-0000-0000-000000000000'::uuid),
        'inventory_reduction_after_checkout',
        'inventory_item',
        item_id,
        log_details
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_inventory_after_checkout_trigger
AFTER UPDATE ON public.inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_inventory_after_checkout();

-- Add comment for documentation
COMMENT ON TRIGGER update_inventory_after_checkout_trigger ON public.inventory_transactions
IS 'Reduces inventory quantities when checkout transactions are marked as delivered - fixed version without updated_at reference';
