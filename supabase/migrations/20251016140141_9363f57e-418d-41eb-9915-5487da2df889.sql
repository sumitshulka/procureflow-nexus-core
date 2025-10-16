-- Fix RLS policy for rfp_templates UPDATE to allow soft deletes
DROP POLICY IF EXISTS "Template creators can update their templates" ON public.rfp_templates;

CREATE POLICY "Template creators can update their templates"
ON public.rfp_templates
FOR UPDATE
TO public
USING (
  (auth.uid() = created_by) OR 
  has_role(auth.uid(), 'admin'::user_role)
);