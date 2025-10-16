-- Create a SECURITY DEFINER function to soft-delete RFP templates safely
CREATE OR REPLACE FUNCTION public.soft_delete_rfp_template(p_template_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator uuid;
BEGIN
  -- Ensure the template exists
  SELECT created_by INTO v_creator FROM public.rfp_templates WHERE id = p_template_id;
  IF v_creator IS NULL THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  -- Authorization: only creator or admins can delete
  IF NOT (v_creator = auth.uid() OR has_role(auth.uid(), 'admin'::user_role)) THEN
    RAISE EXCEPTION 'Not authorized to delete this template';
  END IF;

  -- Soft delete
  UPDATE public.rfp_templates 
  SET is_active = false, updated_at = now()
  WHERE id = p_template_id;

  RETURN true;
END;
$$;

-- Allow public to execute (RLS still enforced inside via has_role/auth checks)
REVOKE ALL ON FUNCTION public.soft_delete_rfp_template(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_rfp_template(uuid) TO anon, authenticated;