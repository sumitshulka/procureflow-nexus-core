-- Phase 2: Complete RLS policies and security fixes

-- 1. Create secure RLS policies for purchase_orders
CREATE POLICY "Admin and procurement officers can manage purchase orders"
ON public.purchase_orders FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'procurement_officer'::user_role));

CREATE POLICY "Vendors can view their own purchase orders"
ON public.purchase_orders FOR SELECT
USING (EXISTS (
  SELECT 1 FROM vendor_registrations vr 
  WHERE vr.id = purchase_orders.vendor_id AND vr.user_id = auth.uid()
));

-- 2. Create secure RLS policies for purchase_order_items
CREATE POLICY "Admin and procurement officers can manage PO items"
ON public.purchase_order_items FOR ALL
USING (EXISTS (
  SELECT 1 FROM purchase_orders po 
  WHERE po.id = purchase_order_items.po_id 
  AND (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'procurement_officer'::user_role))
));

CREATE POLICY "Vendors can view their own PO items"
ON public.purchase_order_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM purchase_orders po
  JOIN vendor_registrations vr ON vr.id = po.vendor_id
  WHERE po.id = purchase_order_items.po_id AND vr.user_id = auth.uid()
));

-- 3. Create secure RLS policies for custom_roles
CREATE POLICY "Admin can manage custom roles"
ON public.custom_roles FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can view active custom roles"
ON public.custom_roles FOR SELECT
USING (is_active = true);

-- 4. Create secure RLS policies for departments
CREATE POLICY "Admin can manage departments"
ON public.departments FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "All authenticated users can view departments"
ON public.departments FOR SELECT
USING (auth.role() = 'authenticated');

-- 5. Create secure RLS policies for system_modules
CREATE POLICY "Admin can manage system modules"
ON public.system_modules FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can view active system modules"
ON public.system_modules FOR SELECT
USING (is_active = true);

-- 6. Create secure RLS policies for role_permissions
CREATE POLICY "Admin can manage role permissions"
ON public.role_permissions FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can view permissions for their roles"
ON public.role_permissions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_role_assignments ura
  WHERE ura.user_id = auth.uid() 
  AND ura.custom_role_id = role_permissions.role_id
  AND ura.is_active = true
));

-- 7. Create secure RLS policies for security_logs
CREATE POLICY "Admin can view all security logs"
ON public.security_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "System can insert security logs"
ON public.security_logs FOR INSERT
WITH CHECK (true);