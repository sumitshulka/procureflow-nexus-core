-- Clean all inventory-related price history for fresh testing
DELETE FROM public.product_price_history WHERE source_type = 'inventory_checkin';
DELETE FROM public.product_price_history WHERE inventory_transaction_id IS NOT NULL;