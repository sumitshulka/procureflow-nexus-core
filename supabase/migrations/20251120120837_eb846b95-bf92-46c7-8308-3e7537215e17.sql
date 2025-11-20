-- Create security definer functions to avoid RLS recursion

-- Function to check if user can access invoice as admin/finance
CREATE OR REPLACE FUNCTION can_access_invoice_as_staff(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id
    AND role IN ('admin', 'finance_officer')
  );
$$;

-- Function to check if user can access invoice as vendor
CREATE OR REPLACE FUNCTION can_access_invoice_as_vendor(p_user_id uuid, p_vendor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vendor_registrations
    WHERE id = p_vendor_id
    AND user_id = p_user_id
  );
$$;

-- Function to check if user can access invoice as approver
CREATE OR REPLACE FUNCTION can_access_invoice_as_approver(p_user_id uuid, p_invoice_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM invoice_approval_history
    WHERE invoice_id = p_invoice_id
    AND approver_id = p_user_id
  );
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "invoices_admin_finance_access" ON invoices;
DROP POLICY IF EXISTS "invoices_vendor_access" ON invoices;
DROP POLICY IF EXISTS "invoices_approver_access" ON invoices;

-- Create new simplified policies using security definer functions
CREATE POLICY "invoices_staff_access"
ON invoices
FOR ALL
TO authenticated
USING (can_access_invoice_as_staff(auth.uid()))
WITH CHECK (can_access_invoice_as_staff(auth.uid()));

CREATE POLICY "invoices_vendor_access"
ON invoices
FOR ALL
TO authenticated
USING (can_access_invoice_as_vendor(auth.uid(), vendor_id))
WITH CHECK (can_access_invoice_as_vendor(auth.uid(), vendor_id));

CREATE POLICY "invoices_approver_view"
ON invoices
FOR SELECT
TO authenticated
USING (can_access_invoice_as_approver(auth.uid(), id));