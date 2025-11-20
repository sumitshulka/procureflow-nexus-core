-- Remove all existing RLS policies on invoices to eliminate recursion
DROP POLICY IF EXISTS "Admins and finance can manage all invoices" ON invoices;
DROP POLICY IF EXISTS "Approvers can view invoices pending their approval" ON invoices;
DROP POLICY IF EXISTS "Vendors can create and view their own invoices" ON invoices;
DROP POLICY IF EXISTS "Vendors can manage their own invoices" ON invoices;
DROP POLICY IF EXISTS "Approvers can view assigned invoices" ON invoices;

-- For now, use simple non-recursive policies to restore functionality
-- Admins and finance officers: full access
CREATE POLICY "Invoices admin_finance_all"
ON invoices
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'finance_officer'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'finance_officer'::user_role));

-- Vendors: can manage their own invoices (based only on vendor_registrations)
CREATE POLICY "Invoices_vendor_own"
ON invoices
FOR ALL
TO authenticated
USING (vendor_id IN (SELECT id FROM vendor_registrations WHERE user_id = auth.uid()))
WITH CHECK (vendor_id IN (SELECT id FROM vendor_registrations WHERE user_id = auth.uid()));

-- Approvers: can view invoices where they appear in approval history
CREATE POLICY "Invoices_approver_view"
ON invoices
FOR SELECT
TO authenticated
USING (id IN (SELECT invoice_id FROM invoice_approval_history WHERE approver_id = auth.uid()));