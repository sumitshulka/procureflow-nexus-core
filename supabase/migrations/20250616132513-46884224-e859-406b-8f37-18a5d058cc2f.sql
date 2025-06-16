
-- First, let's create a table to store menu items/modules with their system references
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  route_path TEXT, -- The actual route path in the system
  parent_id UUID REFERENCES public.menu_items(id),
  display_order INTEGER DEFAULT 0,
  icon_name TEXT, -- Lucide icon name
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Update system_modules to link with menu_items
ALTER TABLE public.system_modules 
ADD COLUMN IF NOT EXISTS menu_item_id UUID REFERENCES public.menu_items(id),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create user role assignments (separate from user_roles which is for system roles)
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  custom_role_id UUID NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, custom_role_id)
);

-- Create user-specific access level overrides
CREATE TABLE IF NOT EXISTS public.user_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  module_id UUID NOT NULL REFERENCES public.system_modules(id) ON DELETE CASCADE,
  permission TEXT NOT NULL, -- view, create, edit, delete, admin
  granted_by UUID,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, module_id, permission)
);

-- Update role_permissions to use UUID for module_id instead of text
ALTER TABLE public.role_permissions 
DROP CONSTRAINT IF EXISTS role_permissions_module_id_fkey,
ADD COLUMN IF NOT EXISTS module_uuid UUID REFERENCES public.system_modules(id);

-- Insert default menu items that correspond to your sidebar
INSERT INTO public.menu_items (name, description, route_path, icon_name, display_order) VALUES
('Dashboard', 'Main dashboard overview', '/', 'LayoutDashboard', 1),
('Product Catalog', 'Manage product catalog', '/catalog', 'ShoppingBag', 2),
('Inventory Management', 'Manage inventory items and transactions', '/inventory', 'Package', 3),
('Procurement Requests', 'Handle procurement requests', '/requests', 'ListChecks', 4),
('RFP Management', 'Manage RFP processes', '/rfp', 'FileText', 5),
('Purchase Orders', 'Manage purchase orders', '/purchase-orders', 'ShoppingCart', 6),
('Approvals', 'Handle approval workflows', '/approvals', 'ClipboardList', 7),
('Budget Management', 'Manage budgets', '/budget', 'Calculator', 8),
('Compliance & Audit', 'Compliance and audit management', '/compliance', 'Shield', 9),
('Risk Management', 'Risk assessment and management', '/risk', 'AlertTriangle', 10),
('Analytics & Reports', 'Analytics and reporting', '/analytics', 'TrendingUp', 11),
('Vendor Management', 'Manage vendors', '/vendors', 'Building2', 12),
('Vendor Portal', 'Vendor portal access', '/vendor-portal', 'Store', 13),
('Settings', 'System settings', '/settings', 'Settings', 14),
('User Management', 'Manage users and roles', '/users', 'Users', 15)
ON CONFLICT (name) DO NOTHING;

-- Update existing system modules to link with menu items (only if they don't have a menu_item_id yet)
UPDATE public.system_modules 
SET menu_item_id = mi.id 
FROM public.menu_items mi 
WHERE system_modules.name = mi.name 
AND system_modules.menu_item_id IS NULL;

-- Insert any missing system modules linked to menu items
INSERT INTO public.system_modules (name, description, menu_item_id)
SELECT mi.name, mi.description, mi.id
FROM public.menu_items mi
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_modules sm WHERE sm.name = mi.name
);

-- Add RLS policies
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

-- Admin can manage all
CREATE POLICY "Admin can manage menu items" ON public.menu_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can manage user role assignments" ON public.user_role_assignments FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can manage user module permissions" ON public.user_module_permissions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own assignments and permissions
CREATE POLICY "Users can view their role assignments" ON public.user_role_assignments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can view their module permissions" ON public.user_module_permissions FOR SELECT USING (user_id = auth.uid());

-- Create function to check if user has specific module permission
CREATE OR REPLACE FUNCTION public.user_has_module_permission(
  p_user_id UUID,
  p_module_name TEXT,
  p_permission TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  has_permission BOOLEAN := false;
  module_id UUID;
BEGIN
  -- Get module ID
  SELECT sm.id INTO module_id
  FROM public.system_modules sm
  LEFT JOIN public.menu_items mi ON sm.menu_item_id = mi.id
  WHERE sm.name = p_module_name AND sm.is_active = true;
  
  IF module_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check user-specific permissions first (override)
  SELECT EXISTS(
    SELECT 1 FROM public.user_module_permissions ump
    WHERE ump.user_id = p_user_id 
    AND ump.module_id = module_id 
    AND ump.permission = p_permission 
    AND ump.is_active = true
  ) INTO has_permission;
  
  IF has_permission THEN
    RETURN true;
  END IF;
  
  -- Check role-based permissions
  SELECT EXISTS(
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.role_permissions rp ON ura.custom_role_id = rp.role_id
    WHERE ura.user_id = p_user_id 
    AND ura.is_active = true
    AND rp.module_uuid = module_id 
    AND (rp.permission = p_permission OR rp.permission = 'admin')
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$$;
