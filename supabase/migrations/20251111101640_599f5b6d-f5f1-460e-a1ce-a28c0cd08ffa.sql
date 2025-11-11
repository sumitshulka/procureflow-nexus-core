-- Adjust RLS for standard_po_settings to use built-in user_roles via public.has_role
-- 1) Drop prior policies to avoid conflicts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='standard_po_settings' AND policyname='Admin users can view standard PO settings'
  ) THEN
    DROP POLICY "Admin users can view standard PO settings" ON public.standard_po_settings;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='standard_po_settings' AND policyname='Authenticated users can view standard PO settings'
  ) THEN
    DROP POLICY "Authenticated users can view standard PO settings" ON public.standard_po_settings;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='standard_po_settings' AND policyname='Admin users can insert standard PO settings'
  ) THEN
    DROP POLICY "Admin users can insert standard PO settings" ON public.standard_po_settings;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='standard_po_settings' AND policyname='Admin users can update standard PO settings'
  ) THEN
    DROP POLICY "Admin users can update standard PO settings" ON public.standard_po_settings;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='standard_po_settings' AND policyname='Admin users can delete standard PO settings'
  ) THEN
    DROP POLICY "Admin users can delete standard PO settings" ON public.standard_po_settings;
  END IF;
END $$;

-- 2) Create clean policies using public.has_role() and user_roles enum
CREATE POLICY "PO settings: select"
  ON public.standard_po_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "PO settings: insert by admins"
  ON public.standard_po_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::user_role)
    OR public.has_role(auth.uid(), 'procurement_officer'::user_role)
  );

CREATE POLICY "PO settings: update by admins"
  ON public.standard_po_settings
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::user_role)
    OR public.has_role(auth.uid(), 'procurement_officer'::user_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::user_role)
    OR public.has_role(auth.uid(), 'procurement_officer'::user_role)
  );

CREATE POLICY "PO settings: delete by admins"
  ON public.standard_po_settings
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::user_role)
    OR public.has_role(auth.uid(), 'procurement_officer'::user_role)
  );