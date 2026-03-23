-- Fix: drop the broken trigger on product_price_history (no updated_at column exists)
DROP TRIGGER IF EXISTS update_product_price_history_updated_at ON public.product_price_history;

-- Now nullify FK references from product_price_history to inventory_transactions
UPDATE public.product_price_history SET inventory_transaction_id = NULL WHERE inventory_transaction_id IS NOT NULL;

-- Clean all inventory data for fresh testing
DELETE FROM public.inventory_transactions;
DELETE FROM public.inventory_batches;
DELETE FROM public.inventory_items;