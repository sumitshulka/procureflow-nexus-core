
-- Create custom_roles table
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  permission TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role_id, module_id, permission)
);

-- Add Row Level Security
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for custom_roles
CREATE POLICY "Admin can manage custom roles" 
ON public.custom_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Create RLS policies for role_permissions
CREATE POLICY "Admin can manage role permissions" 
ON public.role_permissions 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default custom roles if they don't exist
INSERT INTO public.custom_roles (name, description)
VALUES 
('Super Admin', 'Full access to all system features'),
('Department Manager', 'Can manage department requests and users'),
('Finance User', 'Can access financial reports and approve payments')
ON CONFLICT (name) DO NOTHING;
