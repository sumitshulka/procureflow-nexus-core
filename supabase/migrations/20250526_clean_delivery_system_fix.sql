
-- Clean migration to fix delivery details system completely
-- This migration ensures the inventory_transactions table has the correct structure
-- and the trigger functions work without referencing non-existent fields

-- First, ensure the updated_at column exists in inventory_transactions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_transactions' 
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory_transactions 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Update existing rows to have updated_at values if they're null
UPDATE public.inventory_transactions 
SET updated_at = transaction_date 
WHERE updated_at IS NULL;

-- Drop existing trigger and function to ensure clean slate
DROP TRIGGER IF EXISTS update_inventory_after_checkout_trigger ON public.inventory_transactions;
DROP FUNCTION IF EXISTS public.update_inventory_after_checkout();

-- Create the inventory update function without any problematic field references
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

-- Create the trigger
CREATE TRIGGER update_inventory_after_checkout_trigger
AFTER UPDATE ON public.inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_inventory_after_checkout();

-- Create the delivery details update function
CREATE OR REPLACE FUNCTION public.update_transaction_delivery_details(transaction_id uuid, details jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result jsonb;
BEGIN
  -- Update the transaction with delivery details and mark as delivered
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

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_inventory_transactions_updated_at ON public.inventory_transactions;

-- Create trigger to automatically update updated_at on row updates
CREATE TRIGGER update_inventory_transactions_updated_at
    BEFORE UPDATE ON public.inventory_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

-- Add comments for documentation
COMMENT ON TRIGGER update_inventory_after_checkout_trigger ON public.inventory_transactions
IS 'Reduces inventory quantities when checkout transactions are marked as delivered - clean version';

COMMENT ON TRIGGER update_inventory_transactions_updated_at ON public.inventory_transactions
IS 'Automatically updates the updated_at column when a row is modified';

COMMENT ON FUNCTION public.update_transaction_delivery_details(uuid, jsonb)
IS 'Updates transaction delivery details and marks as delivered - clean version';
