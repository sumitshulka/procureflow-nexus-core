SET session_replication_role = 'replica';

-- GRN / Invoice chain
DELETE FROM public.grn_invoice_links;
DELETE FROM public.grn_items;
DELETE FROM public.goods_received_notes;

DELETE FROM public.invoice_approval_history;
DELETE FROM public.invoice_items;
DELETE FROM public.invoices;

-- Purchase Orders chain
DELETE FROM public.po_approval_history;
DELETE FROM public.po_email_logs;
DELETE FROM public.purchase_order_items;
DELETE FROM public.purchase_orders;

-- Procurement requests
DELETE FROM public.procurement_request_items;
DELETE FROM public.procurement_requests;

-- RFP chain
DELETE FROM public.rfp_response_scores;
DELETE FROM public.rfp_response_items;
DELETE FROM public.rfp_responses;
DELETE FROM public.rfp_addendums;
DELETE FROM public.rfp_communications;
DELETE FROM public.rfp_activities;
DELETE FROM public.rfp_notifications;
DELETE FROM public.rfps;

-- Inventory & warehouse transfers
DELETE FROM public.warehouse_transfer_logs;
DELETE FROM public.warehouse_transfer_items;
DELETE FROM public.warehouse_transfers;
DELETE FROM public.inventory_transactions;
DELETE FROM public.inventory_batches;
DELETE FROM public.inventory_items;

-- Product-related
DELETE FROM public.product_price_history;
DELETE FROM public.vendor_products;
DELETE FROM public.product_skus;
DELETE FROM public.category_sku_attributes;
DELETE FROM public.products;

-- Generic approvals tied to wiped entities
DELETE FROM public.approvals WHERE entity_type IN ('procurement_request','purchase_order','invoice','grn','rfp');

-- Activity log entries for wiped entities
DELETE FROM public.activity_logs WHERE entity_type IN ('procurement_request','purchase_order','invoice','grn','rfp','product','inventory');

SET session_replication_role = 'origin';