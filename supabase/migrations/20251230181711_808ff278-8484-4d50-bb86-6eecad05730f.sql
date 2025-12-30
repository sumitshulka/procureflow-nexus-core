-- Create enum for ERP types
CREATE TYPE public.erp_type AS ENUM (
  'sap_s4hana',
  'sap_business_one',
  'oracle_netsuite',
  'oracle_fusion',
  'microsoft_dynamics_365',
  'microsoft_dynamics_nav',
  'sage_intacct',
  'quickbooks_enterprise',
  'tally_prime',
  'custom_rest'
);

-- Create enum for sync entity types
CREATE TYPE public.erp_sync_entity AS ENUM (
  'invoice',
  'purchase_order',
  'vendor',
  'product'
);

-- Create enum for sync status
CREATE TYPE public.erp_sync_status AS ENUM (
  'pending',
  'in_progress',
  'success',
  'failed',
  'partial'
);

-- Create ERP integrations table
CREATE TABLE public.erp_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  erp_type public.erp_type NOT NULL,
  description TEXT,
  
  -- Connection settings
  base_url TEXT NOT NULL,
  auth_type TEXT NOT NULL DEFAULT 'api_key', -- 'api_key', 'oauth2', 'basic', 'bearer'
  auth_config JSONB DEFAULT '{}', -- Stores encrypted credentials reference, not actual secrets
  
  -- Endpoint mappings for custom REST
  endpoint_mappings JSONB DEFAULT '{
    "invoice": {"create": "/invoices", "update": "/invoices/{id}", "method": "POST"},
    "purchase_order": {"create": "/purchase-orders", "update": "/purchase-orders/{id}", "method": "POST"}
  }',
  
  -- Field mappings (our field -> ERP field)
  field_mappings JSONB DEFAULT '{
    "invoice": {},
    "purchase_order": {}
  }',
  
  -- Sync settings
  sync_invoices BOOLEAN DEFAULT true,
  sync_purchase_orders BOOLEAN DEFAULT true,
  sync_vendors BOOLEAN DEFAULT false,
  sync_products BOOLEAN DEFAULT false,
  auto_sync BOOLEAN DEFAULT false,
  sync_frequency_minutes INTEGER DEFAULT 60,
  
  -- Request configuration
  request_headers JSONB DEFAULT '{}',
  request_timeout_seconds INTEGER DEFAULT 30,
  retry_attempts INTEGER DEFAULT 3,
  
  -- Status
  is_active BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status public.erp_sync_status,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ERP sync logs table
CREATE TABLE public.erp_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.erp_integrations(id) ON DELETE CASCADE,
  
  -- What was synced
  entity_type public.erp_sync_entity NOT NULL,
  entity_id UUID NOT NULL,
  entity_reference TEXT, -- Invoice number, PO number, etc.
  
  -- Sync details
  sync_direction TEXT NOT NULL DEFAULT 'outbound', -- 'outbound' (to ERP) or 'inbound' (from ERP)
  status public.erp_sync_status NOT NULL DEFAULT 'pending',
  
  -- Request/Response data (sanitized, no secrets)
  request_payload JSONB,
  response_payload JSONB,
  response_code INTEGER,
  
  -- Error handling
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  
  -- ERP reference
  erp_reference_id TEXT, -- ID returned by ERP system
  erp_reference_number TEXT, -- Document number in ERP
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  
  -- Audit
  triggered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_erp_integrations_active ON public.erp_integrations(is_active) WHERE is_active = true;
CREATE INDEX idx_erp_sync_logs_integration ON public.erp_sync_logs(integration_id);
CREATE INDEX idx_erp_sync_logs_entity ON public.erp_sync_logs(entity_type, entity_id);
CREATE INDEX idx_erp_sync_logs_status ON public.erp_sync_logs(status);
CREATE INDEX idx_erp_sync_logs_created ON public.erp_sync_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.erp_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for erp_integrations (admin only)
CREATE POLICY "Admins can view ERP integrations"
  ON public.erp_integrations
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE POLICY "Admins can create ERP integrations"
  ON public.erp_integrations
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE POLICY "Admins can update ERP integrations"
  ON public.erp_integrations
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE POLICY "Admins can delete ERP integrations"
  ON public.erp_integrations
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.user_role));

-- RLS policies for erp_sync_logs (admin and finance can view)
CREATE POLICY "Admins and finance can view sync logs"
  ON public.erp_sync_logs
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::public.user_role) OR
    public.has_role(auth.uid(), 'finance_officer'::public.user_role)
  );

CREATE POLICY "System can insert sync logs"
  ON public.erp_sync_logs
  FOR INSERT
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_erp_integrations_updated_at
  BEFORE UPDATE ON public.erp_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();