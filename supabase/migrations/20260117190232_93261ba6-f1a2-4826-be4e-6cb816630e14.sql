-- Allow authenticated users to read active menu items (needed for permission-driven navigation)
CREATE POLICY "Users can view active menu items"
ON public.menu_items
FOR SELECT
TO authenticated
USING (is_active = true);