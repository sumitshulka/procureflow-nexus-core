-- Drop existing restrictive RLS policies for RFPs
DROP POLICY IF EXISTS "Organization can manage their RFPs" ON public.rfps;
DROP POLICY IF EXISTS "Vendors can view published RFPs" ON public.rfps;

-- Create simpler, more permissive policies
-- Authenticated users can view all RFPs (for now)
CREATE POLICY "Authenticated users can view all RFPs" 
ON public.rfps 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Authenticated users can create RFPs
CREATE POLICY "Authenticated users can create RFPs" 
ON public.rfps 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Users can update their own RFPs or admins can update any
CREATE POLICY "Users can update own RFPs or admins update any" 
ON public.rfps 
FOR UPDATE 
USING (
  auth.uid() = created_by OR 
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'procurement_officer'::user_role)
);

-- Users can delete their own RFPs or admins can delete any
CREATE POLICY "Users can delete own RFPs or admins delete any" 
ON public.rfps 
FOR DELETE 
USING (
  auth.uid() = created_by OR 
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'procurement_officer'::user_role)
);