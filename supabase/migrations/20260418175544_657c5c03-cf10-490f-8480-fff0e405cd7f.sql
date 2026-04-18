-- Attach the missing trigger so approved GRNs actually post to inventory
DROP TRIGGER IF EXISTS trg_grn_approved_inventory ON public.goods_received_notes;

CREATE TRIGGER trg_grn_approved_inventory
AFTER UPDATE ON public.goods_received_notes
FOR EACH ROW
EXECUTE FUNCTION public.create_grn_inventory_transaction();

-- Improve the function: log skipped rows and raise a NOTICE if nothing was posted,
-- so silent no-ops are visible in Postgres logs.
CREATE OR REPLACE FUNCTION public.create_grn_inventory_transaction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  grn_item RECORD;
  posted_count INT := 0;
  skipped_count INT := 0;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    FOR grn_item IN 
      SELECT gi.*, grn.warehouse_id, grn.received_by, grn.grn_number
      FROM grn_items gi
      JOIN goods_received_notes grn ON grn.id = gi.grn_id
      WHERE grn.id = NEW.id AND gi.quantity_accepted > 0
    LOOP
      IF grn_item.product_id IS NULL THEN
        skipped_count := skipped_count + 1;
        RAISE LOG 'GRN % item % skipped: product_id is null', grn_item.grn_number, grn_item.id;
        CONTINUE;
      END IF;

      INSERT INTO inventory_transactions (
        product_id, type, quantity, target_warehouse_id,
        reference, user_id, notes, unit_price, transaction_date
      ) VALUES (
        grn_item.product_id, 'stock_in', grn_item.quantity_accepted,
        grn_item.warehouse_id, 'GRN: ' || grn_item.grn_number,
        grn_item.received_by, 'Auto-created from GRN approval',
        grn_item.unit_price, now()
      );

      INSERT INTO inventory_items (product_id, warehouse_id, quantity, last_updated)
      VALUES (grn_item.product_id, grn_item.warehouse_id, grn_item.quantity_accepted, now())
      ON CONFLICT (product_id, warehouse_id) 
      DO UPDATE SET 
        quantity = inventory_items.quantity + EXCLUDED.quantity,
        last_updated = now();

      posted_count := posted_count + 1;
    END LOOP;

    RAISE LOG 'GRN % approved: % items posted, % skipped (no product link)',
      NEW.grn_number, posted_count, skipped_count;
  END IF;

  RETURN NEW;
END;
$function$;