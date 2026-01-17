
-- Fix orphan modules by linking them to appropriate menu_items or deactivating duplicates

-- Option 1: Link the orphan "Inventory" module to the Inventory Management menu item
UPDATE public.system_modules 
SET menu_item_id = 'b7c6b517-4fcd-49f5-9966-c2bfe856f896'
WHERE id = '7fb67a66-4456-4ef2-85ae-893f0aae4414' AND name = 'Inventory';

-- Option 2: Link the orphan "Procurement" module to the Procurement Requests menu item
UPDATE public.system_modules 
SET menu_item_id = 'e2275fd4-73f3-44c2-9093-a3b8b2e369dc'
WHERE id = 'ef46221e-03e5-4061-ae79-4877e90ddbf5' AND name = 'Procurement';

-- Option 3: Link the orphan "Reports" module to the Analytics & Reports menu item
UPDATE public.system_modules 
SET menu_item_id = '494bd56e-f1e8-40c3-91da-774005467c99'
WHERE id = 'da36caa2-911f-4b86-83b1-7ec9d92091b2' AND name = 'Reports';
