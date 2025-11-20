-- Add RLS policies for invoices table to allow vendor access

-- Policy: Vendors can view their own invoices
CREATE POLICY "Vendors can view their own invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  public.can_access_invoice_as_vendor(auth.uid(), vendor_id)
  OR public.can_access_invoice_as_staff(auth.uid())
  OR public.can_access_invoice_as_approver(auth.uid(), id)
);

-- Policy: Vendors can insert invoices for themselves
CREATE POLICY "Vendors can create invoices"
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_access_invoice_as_vendor(auth.uid(), vendor_id)
  OR public.can_access_invoice_as_staff(auth.uid())
);

-- Policy: Vendors can update their own draft/submitted invoices
CREATE POLICY "Vendors can update their own invoices"
ON public.invoices
FOR UPDATE
TO authenticated
USING (
  (public.can_access_invoice_as_vendor(auth.uid(), vendor_id) AND status IN ('draft', 'submitted'))
  OR public.can_access_invoice_as_staff(auth.uid())
)
WITH CHECK (
  (public.can_access_invoice_as_vendor(auth.uid(), vendor_id) AND status IN ('draft', 'submitted'))
  OR public.can_access_invoice_as_staff(auth.uid())
);

-- Policy: Only staff can delete invoices
CREATE POLICY "Staff can delete invoices"
ON public.invoices
FOR DELETE
TO authenticated
USING (
  public.can_access_invoice_as_staff(auth.uid())
);

-- Add RLS policies for invoice_items table
CREATE POLICY "Users can view invoice items they have access to"
ON public.invoice_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_items.invoice_id
    AND (
      public.can_access_invoice_as_vendor(auth.uid(), i.vendor_id)
      OR public.can_access_invoice_as_staff(auth.uid())
      OR public.can_access_invoice_as_approver(auth.uid(), i.id)
    )
  )
);

-- Policy: Users can insert invoice items for invoices they can create
CREATE POLICY "Users can create invoice items"
ON public.invoice_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_items.invoice_id
    AND (
      public.can_access_invoice_as_vendor(auth.uid(), i.vendor_id)
      OR public.can_access_invoice_as_staff(auth.uid())
    )
  )
);

-- Policy: Users can update invoice items for invoices they can update
CREATE POLICY "Users can update invoice items"
ON public.invoice_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_items.invoice_id
    AND (
      (public.can_access_invoice_as_vendor(auth.uid(), i.vendor_id) AND i.status IN ('draft', 'submitted'))
      OR public.can_access_invoice_as_staff(auth.uid())
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_items.invoice_id
    AND (
      (public.can_access_invoice_as_vendor(auth.uid(), i.vendor_id) AND i.status IN ('draft', 'submitted'))
      OR public.can_access_invoice_as_staff(auth.uid())
    )
  )
);

-- Policy: Staff can delete invoice items
CREATE POLICY "Staff can delete invoice items"
ON public.invoice_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_items.invoice_id
    AND public.can_access_invoice_as_staff(auth.uid())
  )
);