-- Enable RLS on rfps table
ALTER TABLE public.rfps ENABLE ROW LEVEL SECURITY;

-- Allow organization users to view and manage their own RFPs  
CREATE POLICY "Organization can manage their RFPs" 
ON public.rfps 
FOR ALL 
USING (
  created_by = auth.uid() 
  OR has_role(auth.uid(), 'admin'::user_role) 
  OR has_role(auth.uid(), 'procurement_officer'::user_role)
);

-- Allow approved vendors to view published RFPs
CREATE POLICY "Vendors can view published RFPs" 
ON public.rfps 
FOR SELECT 
USING (
  status = 'published' 
  AND EXISTS (
    SELECT 1 FROM public.vendor_registrations vr 
    WHERE vr.user_id = auth.uid() 
    AND vr.status = 'approved'::vendor_status
  )
);