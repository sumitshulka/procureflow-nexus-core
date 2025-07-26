-- Phase 1 Continued: Fix remaining critical RLS policies

-- Enable RLS on rfp_responses table
ALTER TABLE public.rfp_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for rfp_responses
CREATE POLICY "Vendors can create their own responses" 
ON public.rfp_responses 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM vendor_registrations vr 
    WHERE vr.user_id = auth.uid() AND vr.id = vendor_id
  )
);

CREATE POLICY "Vendors can view and update their own responses" 
ON public.rfp_responses 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM vendor_registrations vr 
    WHERE vr.user_id = auth.uid() AND vr.id = vendor_id
  )
);

CREATE POLICY "Organization can view all responses" 
ON public.rfp_responses 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'procurement_officer'::user_role)
);

-- Enable RLS on rfp_response_items table  
ALTER TABLE public.rfp_response_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for rfp_response_items
CREATE POLICY "Vendors can manage items for their responses" 
ON public.rfp_response_items 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM rfp_responses rr
    JOIN vendor_registrations vr ON vr.id = rr.vendor_id
    WHERE rr.id = rfp_response_items.response_id 
    AND vr.user_id = auth.uid()
  )
);

CREATE POLICY "Organization can view all response items" 
ON public.rfp_response_items 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'procurement_officer'::user_role)
);

-- Enable RLS on custom_roles table
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_roles
CREATE POLICY "Admins can manage custom roles" 
ON public.custom_roles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can view active custom roles" 
ON public.custom_roles 
FOR SELECT 
USING (is_active = true);

-- Enable RLS on system_modules table
ALTER TABLE public.system_modules ENABLE ROW LEVEL SECURITY;

-- RLS policies for system_modules
CREATE POLICY "Admins can manage system modules" 
ON public.system_modules 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can view active system modules" 
ON public.system_modules 
FOR SELECT 
USING (is_active = true);

-- Enable RLS on role_permissions table
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for role_permissions
CREATE POLICY "Admins can manage role permissions" 
ON public.role_permissions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can view role permissions" 
ON public.role_permissions 
FOR SELECT 
USING (true);

-- Phase 2: Secure the vendor_registration_details view
-- Drop the existing view that exposes auth.users
DROP VIEW IF EXISTS public.vendor_registration_details;

-- Create a secure function to get vendor registration details
CREATE OR REPLACE FUNCTION public.get_vendor_registration_details()
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  status vendor_status,
  incorporation_date date,
  registered_address jsonb,
  business_address jsonb,
  billing_address jsonb,
  years_in_business integer,
  annual_turnover numeric,
  reviewed_by uuid,
  reviewed_at timestamptz,
  user_id uuid,
  company_name text,
  company_type text,
  registration_number text,
  pan_number text,
  gst_number text,
  tan_number text,
  primary_email text,
  secondary_email text,
  primary_phone text,
  secondary_phone text,
  website text,
  signatory_name text,
  signatory_designation text,
  signatory_email text,
  signatory_phone text,
  signatory_pan text,
  bank_name text,
  bank_branch text,
  account_number text,
  ifsc_code text,
  account_holder_name text,
  business_description text,
  approval_comments text,
  signatory_full_name text,
  avatar_url text,
  user_email text,
  reviewer_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins and procurement officers can view all vendor details
  IF NOT (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'procurement_officer'::user_role)) THEN
    -- Vendors can only see their own registration details
    RETURN QUERY
    SELECT 
      vr.id,
      vr.created_at,
      vr.updated_at,
      vr.status,
      vr.incorporation_date,
      vr.registered_address,
      vr.business_address,
      vr.billing_address,
      vr.years_in_business,
      vr.annual_turnover,
      vr.reviewed_by,
      vr.reviewed_at,
      vr.user_id,
      vr.company_name,
      vr.company_type,
      vr.registration_number,
      vr.pan_number,
      vr.gst_number,
      vr.tan_number,
      vr.primary_email,
      vr.secondary_email,
      vr.primary_phone,
      vr.secondary_phone,
      vr.website,
      vr.signatory_name,
      vr.signatory_designation,
      vr.signatory_email,
      vr.signatory_phone,
      vr.signatory_pan,
      vr.bank_name,
      vr.bank_branch,
      vr.account_number,
      vr.ifsc_code,
      vr.account_holder_name,
      vr.business_description,
      vr.approval_comments,
      vr.signatory_full_name,
      p.avatar_url,
      p_user.email as user_email,
      p_reviewer.full_name as reviewer_name
    FROM vendor_registrations vr
    LEFT JOIN profiles p ON p.id = vr.user_id
    LEFT JOIN auth.users p_user ON p_user.id = vr.user_id
    LEFT JOIN profiles p_reviewer ON p_reviewer.id = vr.reviewed_by
    WHERE vr.user_id = auth.uid();
  ELSE
    -- Admins and procurement officers can see all vendor details
    RETURN QUERY
    SELECT 
      vr.id,
      vr.created_at,
      vr.updated_at,
      vr.status,
      vr.incorporation_date,
      vr.registered_address,
      vr.business_address,
      vr.billing_address,
      vr.years_in_business,
      vr.annual_turnover,
      vr.reviewed_by,
      vr.reviewed_at,
      vr.user_id,
      vr.company_name,
      vr.company_type,
      vr.registration_number,
      vr.pan_number,
      vr.gst_number,
      vr.tan_number,
      vr.primary_email,
      vr.secondary_email,
      vr.primary_phone,
      vr.secondary_phone,
      vr.website,
      vr.signatory_name,
      vr.signatory_designation,
      vr.signatory_email,
      vr.signatory_phone,
      vr.signatory_pan,
      vr.bank_name,
      vr.bank_branch,
      vr.account_number,
      vr.ifsc_code,
      vr.account_holder_name,
      vr.business_description,
      vr.approval_comments,
      vr.signatory_full_name,
      p.avatar_url,
      p_user.email as user_email,
      p_reviewer.full_name as reviewer_name
    FROM vendor_registrations vr
    LEFT JOIN profiles p ON p.id = vr.user_id
    LEFT JOIN auth.users p_user ON p_user.id = vr.user_id
    LEFT JOIN profiles p_reviewer ON p_reviewer.id = vr.reviewed_by;
  END IF;
END;
$$;