-- Deactivate Vendor Portal from system_modules as it's a separate vendor-only portal
-- and should not be part of role-based permissions for internal users
UPDATE menu_items 
SET is_active = false 
WHERE route_path = '/vendor-portal';

-- Delete any user_module_permissions referencing vendor portal
DELETE FROM user_module_permissions 
WHERE module_id = '433c877f-0ed8-4aca-8dc0-1eb210b3f12f';

-- Deactivate the Vendor Portal module from system_modules
UPDATE system_modules 
SET is_active = false 
WHERE id = '433c877f-0ed8-4aca-8dc0-1eb210b3f12f';