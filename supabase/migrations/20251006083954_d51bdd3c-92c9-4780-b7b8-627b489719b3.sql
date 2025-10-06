-- Add RFP reopen time limit setting to organization_settings
ALTER TABLE public.organization_settings 
ADD COLUMN IF NOT EXISTS rfp_reopen_time_limit_days INTEGER DEFAULT 30;

COMMENT ON COLUMN public.organization_settings.rfp_reopen_time_limit_days IS 'Number of days after closing within which an RFP can be reopened by publishing an addendum';