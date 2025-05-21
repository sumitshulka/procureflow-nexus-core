
-- Verify and reinstall the inventory update trigger to ensure it works correctly

-- First drop the existing trigger if it exists
DROP TRIGGER IF EXISTS update_inventory_after_checkout_trigger ON public.inventory_transactions;

-- Recreate the trigger function with improved logging
CREATE OR REPLACE FUNCTION public.update_inventory_after_checkout()
RETURNS TRIGGER AS $$
DECLARE
  item_id uuid;
  log_details jsonb;
BEGIN
  -- Only proceed if this is an update to a check_out transaction setting delivery status to "delivered"
  IF NEW.type = 'check_out' AND NEW.delivery_status = 'delivered' AND 
     (OLD.delivery_status IS NULL OR OLD.delivery_status <> 'delivered') THEN
    
    -- Log that the trigger has fired
    RAISE NOTICE 'Inventory update trigger fired for transaction: %', NEW.id;
    RAISE NOTICE 'Product ID: %, Quantity: %, Warehouse: %', NEW.product_id, NEW.quantity, NEW.source_warehouse_id;
    
    -- Find the inventory item ID
    SELECT id INTO item_id FROM inventory_items 
    WHERE product_id = NEW.product_id AND warehouse_id = NEW.source_warehouse_id;
    
    IF item_id IS NULL THEN
      RAISE NOTICE 'No inventory item found for product % in warehouse %', NEW.product_id, NEW.source_warehouse_id;
    ELSE
      -- Update inventory quantity by reducing from source warehouse
      UPDATE public.inventory_items
      SET 
        quantity = GREATEST(0, quantity - NEW.quantity),  -- Prevent negative values
        last_updated = NOW()
      WHERE id = item_id;
      
      RAISE NOTICE 'Updated inventory item: % - reduced quantity by %', item_id, NEW.quantity;
      
      -- Build detailed log information
      log_details := jsonb_build_object(
        'transaction_id', NEW.id,
        'product_id', NEW.product_id,
        'quantity_reduced', NEW.quantity,
        'warehouse_id', NEW.source_warehouse_id,
        'inventory_item_id', item_id,
        'trigger_time', now()
      );
      
      -- Log the inventory update with more details
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
        NEW.product_id,
        log_details
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for inventory updates
CREATE TRIGGER update_inventory_after_checkout_trigger
AFTER UPDATE ON public.inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_inventory_after_checkout();

-- Add a comment to the trigger for documentation
COMMENT ON TRIGGER update_inventory_after_checkout_trigger ON public.inventory_transactions
IS 'Reduces inventory quantities when checkout transactions are marked as delivered';
