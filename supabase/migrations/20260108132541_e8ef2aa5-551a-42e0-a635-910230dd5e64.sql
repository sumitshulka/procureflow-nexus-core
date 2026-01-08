-- Drop the existing status check constraint
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

-- Add updated check constraint that includes approval-related statuses
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_check 
CHECK (status = ANY (ARRAY['draft'::text, 'pending_approval'::text, 'approved'::text, 'rejected'::text, 'sent'::text, 'acknowledged'::text, 'in_progress'::text, 'delivered'::text, 'completed'::text, 'canceled'::text]));