-- Step 1: Drop all RLS policies that depend on user_roles.role column
DROP POLICY IF EXISTS "Admin users can delete products" ON products;
DROP POLICY IF EXISTS "Admin users can insert organization settings" ON organization_settings;
DROP POLICY IF EXISTS "Admin users can insert products" ON products;
DROP POLICY IF EXISTS "Admin users can manage categories" ON categories;
DROP POLICY IF EXISTS "Admin users can manage units" ON units;
DROP POLICY IF EXISTS "Admin users can manage warehouses" ON warehouses;
DROP POLICY IF EXISTS "Admin users can update organization settings" ON organization_settings;
DROP POLICY IF EXISTS "Admin users can update products" ON products;
DROP POLICY IF EXISTS "Admins and procurement officers can update registrations" ON vendor_registrations;
DROP POLICY IF EXISTS "Admins and procurement officers can view all registrations" ON vendor_registrations;
DROP POLICY IF EXISTS "Admins can manage all vendor categories" ON vendor_product_categories;
DROP POLICY IF EXISTS "Admins can view and verify all documents" ON vendor_documents;
DROP POLICY IF EXISTS "Allow vendor role creation during registration" ON user_roles;
DROP POLICY IF EXISTS "Only admin and procurement officers can insert categories" ON categories;
DROP POLICY IF EXISTS "Only admin and procurement officers can insert units" ON units;
DROP POLICY IF EXISTS "Only admin and procurement officers can update categories" ON categories;
DROP POLICY IF EXISTS "Only admin and procurement officers can update units" ON units;
DROP POLICY IF EXISTS "Only admin, creator and procurement officers can update product" ON products;
DROP POLICY IF EXISTS "Procurement officers and admins can delete any request items" ON procurement_request_items;
DROP POLICY IF EXISTS "Procurement officers and admins can update any request" ON procurement_requests;
DROP POLICY IF EXISTS "Procurement officers and admins can update any request items" ON procurement_request_items;
DROP POLICY IF EXISTS "Procurement officers and admins can view all request items" ON procurement_request_items;
DROP POLICY IF EXISTS "Procurement officers and admins can view all requests" ON procurement_requests;

-- Step 2: Add the new role_id column
ALTER TABLE public.user_roles ADD COLUMN role_id uuid REFERENCES public.custom_roles(id) ON DELETE CASCADE;

-- Step 3: Map existing enum values to their corresponding custom_roles IDs
UPDATE public.user_roles ur
SET role_id = cr.id
FROM public.custom_roles cr
WHERE (ur.role::text = 'admin' AND cr.name = 'Admin')
   OR (ur.role::text = 'requester' AND cr.name = 'Requester')
   OR (ur.role::text = 'procurement_officer' AND cr.name = 'Procurement Officer')
   OR (ur.role::text = 'inventory_manager' AND cr.name = 'Inventory Manager')
   OR (ur.role::text = 'finance_officer' AND cr.name = 'Finance Officer')
   OR (ur.role::text = 'evaluation_committee' AND cr.name = 'Evaluation Committee')
   OR (ur.role::text = 'department_head' AND cr.name = 'Department Head');

-- Step 4: Drop the old role column
ALTER TABLE public.user_roles DROP COLUMN role;

-- Step 5: Make role_id NOT NULL
ALTER TABLE public.user_roles ALTER COLUMN role_id SET NOT NULL;

-- Step 6: Update the unique constraint
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_id_key UNIQUE (user_id, role_id);

-- Step 7: Create a helper function to check role by name
CREATE OR REPLACE FUNCTION public.has_role_by_name(_user_id uuid, _role_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.custom_roles cr ON ur.role_id = cr.id
    WHERE ur.user_id = _user_id
      AND LOWER(cr.name) = LOWER(_role_name)
  )
$$;

-- Step 8: Update the can_assign_role function to work with UUIDs
DROP FUNCTION IF EXISTS public.can_assign_role(uuid, user_role);
CREATE OR REPLACE FUNCTION public.can_assign_role(target_user_id uuid, role_to_assign uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins can assign any role
  RETURN public.has_role_by_name(auth.uid(), 'admin');
END;
$$;

-- Step 9: Recreate the RLS policies using the new has_role_by_name function
CREATE POLICY "Admin users can delete products" ON products
FOR DELETE TO authenticated
USING (public.has_role_by_name(auth.uid(), 'admin'));

CREATE POLICY "Admin users can insert organization settings" ON organization_settings
FOR INSERT TO authenticated
WITH CHECK (public.has_role_by_name(auth.uid(), 'admin'));

CREATE POLICY "Admin users can insert products" ON products
FOR INSERT TO authenticated
WITH CHECK (public.has_role_by_name(auth.uid(), 'admin') OR public.has_role_by_name(auth.uid(), 'procurement_officer'));

CREATE POLICY "Admin users can manage categories" ON categories
FOR ALL TO authenticated
USING (public.has_role_by_name(auth.uid(), 'admin'));

CREATE POLICY "Admin users can manage units" ON units
FOR ALL TO authenticated
USING (public.has_role_by_name(auth.uid(), 'admin'));

CREATE POLICY "Admin users can manage warehouses" ON warehouses
FOR ALL TO authenticated
USING (public.has_role_by_name(auth.uid(), 'admin'));

CREATE POLICY "Admin users can update organization settings" ON organization_settings
FOR UPDATE TO authenticated
USING (public.has_role_by_name(auth.uid(), 'admin'));

CREATE POLICY "Admin users can update products" ON products
FOR UPDATE TO authenticated
USING (public.has_role_by_name(auth.uid(), 'admin'));

CREATE POLICY "Admins and procurement officers can update registrations" ON vendor_registrations
FOR UPDATE TO authenticated
USING (public.has_role_by_name(auth.uid(), 'admin') OR public.has_role_by_name(auth.uid(), 'procurement_officer'));

CREATE POLICY "Admins and procurement officers can view all registrations" ON vendor_registrations
FOR SELECT TO authenticated
USING (public.has_role_by_name(auth.uid(), 'admin') OR public.has_role_by_name(auth.uid(), 'procurement_officer') OR user_id = auth.uid());

CREATE POLICY "Admins can manage all vendor categories" ON vendor_product_categories
FOR ALL TO authenticated
USING (public.has_role_by_name(auth.uid(), 'admin'));

CREATE POLICY "Admins can view and verify all documents" ON vendor_documents
FOR ALL TO authenticated
USING (public.has_role_by_name(auth.uid(), 'admin'));

CREATE POLICY "Allow vendor role creation during registration" ON user_roles
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Only admin and procurement officers can insert categories" ON categories
FOR INSERT TO authenticated
WITH CHECK (public.has_role_by_name(auth.uid(), 'admin') OR public.has_role_by_name(auth.uid(), 'procurement_officer'));

CREATE POLICY "Only admin and procurement officers can insert units" ON units
FOR INSERT TO authenticated
WITH CHECK (public.has_role_by_name(auth.uid(), 'admin') OR public.has_role_by_name(auth.uid(), 'procurement_officer'));

CREATE POLICY "Only admin and procurement officers can update categories" ON categories
FOR UPDATE TO authenticated
USING (public.has_role_by_name(auth.uid(), 'admin') OR public.has_role_by_name(auth.uid(), 'procurement_officer'));

CREATE POLICY "Only admin and procurement officers can update units" ON units
FOR UPDATE TO authenticated
USING (public.has_role_by_name(auth.uid(), 'admin') OR public.has_role_by_name(auth.uid(), 'procurement_officer'));

CREATE POLICY "Only admin, creator and procurement officers can update product" ON products
FOR UPDATE TO authenticated
USING (public.has_role_by_name(auth.uid(), 'admin') OR public.has_role_by_name(auth.uid(), 'procurement_officer') OR created_by = auth.uid());

CREATE POLICY "Procurement officers and admins can delete any request items" ON procurement_request_items
FOR DELETE TO authenticated
USING (public.has_role_by_name(auth.uid(), 'admin') OR public.has_role_by_name(auth.uid(), 'procurement_officer'));

CREATE POLICY "Procurement officers and admins can update any request" ON procurement_requests
FOR UPDATE TO authenticated
USING (public.has_role_by_name(auth.uid(), 'admin') OR public.has_role_by_name(auth.uid(), 'procurement_officer'));

CREATE POLICY "Procurement officers and admins can update any request items" ON procurement_request_items
FOR UPDATE TO authenticated
USING (public.has_role_by_name(auth.uid(), 'admin') OR public.has_role_by_name(auth.uid(), 'procurement_officer'));

CREATE POLICY "Procurement officers and admins can view all request items" ON procurement_request_items
FOR SELECT TO authenticated
USING (public.has_role_by_name(auth.uid(), 'admin') OR public.has_role_by_name(auth.uid(), 'procurement_officer') OR EXISTS (
  SELECT 1 FROM procurement_requests pr WHERE pr.id = request_id AND pr.requester_id = auth.uid()
));

CREATE POLICY "Procurement officers and admins can view all requests" ON procurement_requests
FOR SELECT TO authenticated
USING (public.has_role_by_name(auth.uid(), 'admin') OR public.has_role_by_name(auth.uid(), 'procurement_officer') OR requester_id = auth.uid());