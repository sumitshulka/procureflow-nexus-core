-- Add RLS policy to allow admins to update any user's profile
CREATE POLICY "Admins can update any profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Also add policy for admins to view all profiles (in case it's missing)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::user_role));