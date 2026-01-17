-- Insert default system roles into custom_roles table if they don't exist
-- Using ON CONFLICT to avoid duplicates based on name

INSERT INTO public.custom_roles (id, name, description, is_active, created_at)
VALUES 
  (gen_random_uuid(), 'Admin', 'Full system access with all permissions', true, now()),
  (gen_random_uuid(), 'Requester', 'Can create and manage procurement requests', true, now()),
  (gen_random_uuid(), 'Procurement Officer', 'Manages procurement processes and RFPs', true, now()),
  (gen_random_uuid(), 'Inventory Manager', 'Manages inventory and warehouse operations', true, now()),
  (gen_random_uuid(), 'Finance Officer', 'Handles financial operations and invoices', true, now()),
  (gen_random_uuid(), 'Evaluation Committee', 'Evaluates vendor proposals and bids', true, now()),
  (gen_random_uuid(), 'Department Head', 'Approves department requests and budgets', true, now())
ON CONFLICT DO NOTHING;