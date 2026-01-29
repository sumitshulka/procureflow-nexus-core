-- Fix security issues for newly created functions and views

-- Fix function search_path issues
ALTER FUNCTION public.generate_grn_number() SET search_path = public;
ALTER FUNCTION public.update_po_delivery_status() SET search_path = public;
ALTER FUNCTION public.create_grn_inventory_transaction() SET search_path = public;

-- Fix SECURITY DEFINER views by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS three_way_match_results CASCADE;
DROP VIEW IF EXISTS po_delivery_summary CASCADE;
DROP VIEW IF EXISTS po_item_receipt_status CASCADE;

-- Recreate views with SECURITY INVOKER (default, explicit for clarity)
CREATE VIEW po_item_receipt_status 
WITH (security_invoker = true) AS
SELECT 
  poi.id AS po_item_id,
  poi.po_id,
  poi.product_id,
  poi.description,
  poi.quantity AS quantity_ordered,
  COALESCE(SUM(CASE WHEN grn.status = 'approved' THEN gi.quantity_accepted ELSE 0 END), 0)::INTEGER AS quantity_received,
  (poi.quantity - COALESCE(SUM(CASE WHEN grn.status = 'approved' THEN gi.quantity_accepted ELSE 0 END), 0))::INTEGER AS quantity_pending,
  poi.unit_price,
  poi.total_price AS ordered_value,
  COALESCE(SUM(CASE WHEN grn.status = 'approved' THEN gi.total_value ELSE 0 END), 0)::NUMERIC(15,2) AS received_value
FROM purchase_order_items poi
LEFT JOIN grn_items gi ON gi.po_item_id = poi.id
LEFT JOIN goods_received_notes grn ON grn.id = gi.grn_id
GROUP BY poi.id, poi.po_id, poi.product_id, poi.description, poi.quantity, poi.unit_price, poi.total_price;

CREATE VIEW po_delivery_summary 
WITH (security_invoker = true) AS
SELECT 
  po.id AS po_id,
  po.po_number,
  po.vendor_id,
  po.status AS po_status,
  po.final_amount AS po_value,
  COUNT(DISTINCT grn.id) FILTER (WHERE grn.status = 'approved')::INTEGER AS grn_count,
  SUM(poi.quantity)::INTEGER AS total_ordered,
  COALESCE(SUM(pirs.quantity_received), 0)::INTEGER AS total_received,
  (SUM(poi.quantity) - COALESCE(SUM(pirs.quantity_received), 0))::INTEGER AS total_pending,
  CASE 
    WHEN COALESCE(SUM(pirs.quantity_received), 0) = 0 THEN 'pending'
    WHEN COALESCE(SUM(pirs.quantity_received), 0) >= SUM(poi.quantity) THEN 'fully_received'
    ELSE 'partially_received'
  END AS delivery_status
FROM purchase_orders po
LEFT JOIN purchase_order_items poi ON poi.po_id = po.id
LEFT JOIN po_item_receipt_status pirs ON pirs.po_item_id = poi.id
LEFT JOIN goods_received_notes grn ON grn.purchase_order_id = po.id
GROUP BY po.id, po.po_number, po.vendor_id, po.status, po.final_amount;

CREATE VIEW three_way_match_results 
WITH (security_invoker = true) AS
SELECT 
  inv.id AS invoice_id,
  inv.invoice_number,
  inv.vendor_id,
  inv.purchase_order_id,
  inv.total_amount AS invoice_amount,
  po.po_number,
  po.final_amount AS po_amount,
  COALESCE(grn_totals.grn_value, 0)::NUMERIC(15,2) AS grn_value,
  COALESCE(grn_totals.grn_count, 0)::INTEGER AS linked_grn_count,
  (inv.total_amount - po.final_amount)::NUMERIC(15,2) AS po_variance,
  (inv.total_amount - COALESCE(grn_totals.grn_value, 0))::NUMERIC(15,2) AS grn_variance,
  CASE WHEN po.final_amount > 0 
    THEN ((inv.total_amount - po.final_amount) / po.final_amount * 100)::NUMERIC(10,2)
    ELSE 0 
  END AS po_variance_percent,
  CASE WHEN grn_totals.grn_value > 0 
    THEN ((inv.total_amount - grn_totals.grn_value) / grn_totals.grn_value * 100)::NUMERIC(10,2)
    ELSE 0 
  END AS grn_variance_percent
FROM invoices inv
LEFT JOIN purchase_orders po ON po.id = inv.purchase_order_id
LEFT JOIN (
  SELECT 
    gil.invoice_id,
    COUNT(DISTINCT gil.grn_id) AS grn_count,
    SUM(gi.total_value) AS grn_value
  FROM grn_invoice_links gil
  JOIN goods_received_notes grn ON grn.id = gil.grn_id AND grn.status = 'approved'
  JOIN grn_items gi ON gi.grn_id = grn.id
  GROUP BY gil.invoice_id
) grn_totals ON grn_totals.invoice_id = inv.id
WHERE inv.purchase_order_id IS NOT NULL;