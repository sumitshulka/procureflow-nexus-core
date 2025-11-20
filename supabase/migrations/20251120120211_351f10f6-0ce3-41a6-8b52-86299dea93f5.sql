-- Drop all existing policies on invoices
DROP POLICY IF EXISTS "Invoices admin_finance_all" ON invoices;
DROP POLICY IF EXISTS "Invoices_vendor_own" ON invoices;
DROP POLICY IF EXISTS "Invoices_approver_view" ON invoices;

-- Create simple policies without using has_role function to avoid recursion
-- Policy 1: Users with admin or finance_officer role in user_roles table can do everything
CREATE POLICY "invoices_admin_finance_access"
ON invoices
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'finance_officer')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'finance_officer')
  )
);

-- Policy 2: Vendors can manage their own invoices
CREATE POLICY "invoices_vendor_access"
ON invoices
FOR ALL
TO authenticated
USING (
  vendor_id IN (
    SELECT id FROM vendor_registrations
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  vendor_id IN (
    SELECT id FROM vendor_registrations
    WHERE user_id = auth.uid()
  )
);

-- Policy 3: Approvers can view invoices they need to approve
CREATE POLICY "invoices_approver_access"
ON invoices
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT invoice_id FROM invoice_approval_history
    WHERE approver_id = auth.uid()
  )
);