-- Fix RLS policy for RFP template updates (soft delete)
-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Template creators can update their templates" ON public.rfp_templates;

-- Create a comprehensive update policy
CREATE POLICY "Template creators can update their templates" 
ON public.rfp_templates 
FOR UPDATE 
USING (
  auth.uid() = created_by OR 
  has_role(auth.uid(), 'admin'::user_role)
)
WITH CHECK (
  auth.uid() = created_by OR 
  has_role(auth.uid(), 'admin'::user_role)
);