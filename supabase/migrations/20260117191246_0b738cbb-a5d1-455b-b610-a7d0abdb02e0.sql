
-- Delete permissions for duplicate modules (since proper modules already have permissions)
DELETE FROM public.role_permissions
WHERE module_uuid IN (
  '7fb67a66-4456-4ef2-85ae-893f0aae4414',  -- Inventory (duplicate)
  'ef46221e-03e5-4061-ae79-4877e90ddbf5',  -- Procurement (duplicate)
  'da36caa2-911f-4b86-83b1-7ec9d92091b2'   -- Reports (duplicate)
);

-- Deactivate the duplicate modules
UPDATE public.system_modules
SET is_active = false
WHERE id IN (
  '7fb67a66-4456-4ef2-85ae-893f0aae4414',  -- Inventory (duplicate)
  'ef46221e-03e5-4061-ae79-4877e90ddbf5',  -- Procurement (duplicate)
  'da36caa2-911f-4b86-83b1-7ec9d92091b2'   -- Reports (duplicate)
);
