-- Drop the existing policy
DROP POLICY IF EXISTS "Admin users can manage standard PO settings" ON standard_po_settings;

-- Create separate policies for better control
CREATE POLICY "Admin users can view standard PO settings"
  ON standard_po_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert standard PO settings"
  ON standard_po_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN custom_roles cr ON ura.custom_role_id = cr.id
      WHERE ura.user_id = auth.uid()
      AND cr.name IN ('Admin', 'Super Admin')
    )
  );

CREATE POLICY "Admin users can update standard PO settings"
  ON standard_po_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN custom_roles cr ON ura.custom_role_id = cr.id
      WHERE ura.user_id = auth.uid()
      AND cr.name IN ('Admin', 'Super Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN custom_roles cr ON ura.custom_role_id = cr.id
      WHERE ura.user_id = auth.uid()
      AND cr.name IN ('Admin', 'Super Admin')
    )
  );

CREATE POLICY "Admin users can delete standard PO settings"
  ON standard_po_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN custom_roles cr ON ura.custom_role_id = cr.id
      WHERE ura.user_id = auth.uid()
      AND cr.name IN ('Admin', 'Super Admin')
    )
  );