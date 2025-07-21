-- Fix RLS policy for RFP template deletion
-- First drop the existing policy
DROP POLICY IF EXISTS "Template creators can delete their templates" ON public.rfp_templates;

-- Create a more robust delete policy
CREATE POLICY "Template creators can delete their templates" 
ON public.rfp_templates 
FOR DELETE 
USING (
  auth.uid() = created_by OR 
  has_role(auth.uid(), 'admin'::user_role)
);

-- Also ensure created_by is properly set on insert
DROP POLICY IF EXISTS "Authenticated users can create rfp templates" ON public.rfp_templates;

CREATE POLICY "Authenticated users can create rfp templates" 
ON public.rfp_templates 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND 
  auth.uid() IS NOT NULL
);