-- Create table for Email Provider Settings (single active provider)
CREATE TABLE IF NOT EXISTS public.email_provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('google_workspace','gmail','m365','outlook','custom_smtp')),
  from_email TEXT NOT NULL,
  from_name TEXT,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_secure BOOLEAN DEFAULT true,
  username TEXT,
  imap_host TEXT,
  imap_port INTEGER,
  imap_secure BOOLEAN,
  pop_host TEXT,
  pop_port INTEGER,
  pop_secure BOOLEAN,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure only one active provider at a time
CREATE UNIQUE INDEX IF NOT EXISTS one_active_email_provider
ON public.email_provider_settings ((is_active))
WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.email_provider_settings ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for full management
DROP POLICY IF EXISTS "Admins can manage email provider settings" ON public.email_provider_settings;
CREATE POLICY "Admins can manage email provider settings"
ON public.email_provider_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Trigger to maintain updated_at
DROP TRIGGER IF EXISTS update_email_provider_settings_updated_at ON public.email_provider_settings;
CREATE TRIGGER update_email_provider_settings_updated_at
BEFORE UPDATE ON public.email_provider_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();