-- Update Dashboard menu item to have correct route path
UPDATE menu_items 
SET route_path = '/dashboard' 
WHERE name = 'Dashboard' AND route_path = '/';