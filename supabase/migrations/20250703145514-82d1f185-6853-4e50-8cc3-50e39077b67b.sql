-- Allow vendors to update their own registration data
CREATE POLICY "Vendors can update their own registrations" 
ON public.vendor_registrations 
FOR UPDATE 
USING (auth.uid() = user_id);