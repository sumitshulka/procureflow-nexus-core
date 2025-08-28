-- Add SMTP password column to store provider/app password
ALTER TABLE public.email_provider_settings
ADD COLUMN IF NOT EXISTS smtp_password TEXT;