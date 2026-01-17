-- Add Vendor role to custom_roles if it doesn't exist
INSERT INTO public.custom_roles (id, name, description, is_active, created_at)
VALUES (gen_random_uuid(), 'Vendor', 'External vendor/supplier with access to vendor portal', true, now())
ON CONFLICT DO NOTHING;