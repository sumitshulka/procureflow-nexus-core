-- Enable RLS on rfps table
ALTER TABLE public.rfps ENABLE ROW LEVEL SECURITY;

-- Allow organizations to view and manage their own RFPs
CREATE POLICY "Organizations can view their own RFPs" 
ON public.rfps 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.organization_id = rfps.organization_id
  )
);

CREATE POLICY "Organizations can manage their own RFPs" 
ON public.rfps 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.organization_id = rfps.organization_id
  )
);

-- Allow approved vendors to view published RFPs
CREATE POLICY "Approved vendors can view published RFPs" 
ON public.rfps 
FOR SELECT 
USING (
  status = 'published' 
  AND EXISTS (
    SELECT 1 FROM public.vendor_registrations vr 
    WHERE vr.user_id = auth.uid() 
    AND vr.status = 'approved'
  )
);