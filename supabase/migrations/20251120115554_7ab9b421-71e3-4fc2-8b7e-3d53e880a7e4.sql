-- Fix infinite recursion in invoices RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins and finance can manage all invoices" ON invoices;
DROP POLICY IF EXISTS "Approvers can view invoices pending their approval" ON invoices;
DROP POLICY IF EXISTS "Vendors can create and view their own invoices" ON invoices;

-- Recreate policies without circular references
-- Policy for admins and finance officers
CREATE POLICY "Admins and finance can manage all invoices"
ON invoices
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'finance_officer'::user_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'finance_officer'::user_role)
);

-- Policy for vendors - simplified without subquery on invoices
CREATE POLICY "Vendors can manage their own invoices"
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

-- Policy for approvers - check approval history directly
CREATE POLICY "Approvers can view assigned invoices"
ON invoices
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT invoice_id 
    FROM invoice_approval_history 
    WHERE approver_id = auth.uid()
  )
);