-- Create compliance areas table
CREATE TABLE public.compliance_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#94a3b8',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create compliance rules table
CREATE TABLE public.compliance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID REFERENCES public.compliance_areas(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL, -- 'mandatory', 'recommended', 'optional'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  frequency TEXT DEFAULT 'monthly', -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one-time'
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create compliance checks table
CREATE TABLE public.compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.compliance_rules(id) ON DELETE CASCADE,
  check_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'compliant', 'non_compliant', 'partial'
  checked_by UUID,
  evidence JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  score INTEGER, -- 0-100
  next_check_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create compliance violations table
CREATE TABLE public.compliance_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id UUID REFERENCES public.compliance_checks(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.compliance_rules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  identified_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolution_date TIMESTAMP WITH TIME ZONE,
  assigned_to UUID,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create compliance audits table
CREATE TABLE public.compliance_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID REFERENCES public.compliance_areas(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  audit_type TEXT DEFAULT 'internal', -- 'internal', 'external', 'regulatory'
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'failed'
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  auditor_name TEXT,
  findings JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  overall_result TEXT, -- 'passed', 'passed_with_issues', 'failed'
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.compliance_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_audits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for compliance_areas
CREATE POLICY "Authenticated users can view compliance areas"
  ON public.compliance_areas FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage compliance areas"
  ON public.compliance_areas FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for compliance_rules
CREATE POLICY "Authenticated users can view compliance rules"
  ON public.compliance_rules FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage compliance rules"
  ON public.compliance_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for compliance_checks
CREATE POLICY "Authenticated users can view compliance checks"
  ON public.compliance_checks FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create compliance checks"
  ON public.compliance_checks FOR INSERT
  WITH CHECK (auth.uid() = checked_by);

CREATE POLICY "Users can update their own checks or admins can update any"
  ON public.compliance_checks FOR UPDATE
  USING (auth.uid() = checked_by OR has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for compliance_violations
CREATE POLICY "Authenticated users can view compliance violations"
  ON public.compliance_violations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create violations"
  ON public.compliance_violations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Assigned users and admins can update violations"
  ON public.compliance_violations FOR UPDATE
  USING (auth.uid() = assigned_to OR has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for compliance_audits
CREATE POLICY "Authenticated users can view compliance audits"
  ON public.compliance_audits FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage compliance audits"
  ON public.compliance_audits FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Create indexes for better performance
CREATE INDEX idx_compliance_rules_area ON public.compliance_rules(area_id);
CREATE INDEX idx_compliance_checks_rule ON public.compliance_checks(rule_id);
CREATE INDEX idx_compliance_checks_status ON public.compliance_checks(status);
CREATE INDEX idx_compliance_violations_status ON public.compliance_violations(status);
CREATE INDEX idx_compliance_violations_severity ON public.compliance_violations(severity);
CREATE INDEX idx_compliance_audits_area ON public.compliance_audits(area_id);

-- Create triggers for updated_at
CREATE TRIGGER update_compliance_areas_updated_at
  BEFORE UPDATE ON public.compliance_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_rules_updated_at
  BEFORE UPDATE ON public.compliance_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_checks_updated_at
  BEFORE UPDATE ON public.compliance_checks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_violations_updated_at
  BEFORE UPDATE ON public.compliance_violations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_audits_updated_at
  BEFORE UPDATE ON public.compliance_audits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default compliance areas
INSERT INTO public.compliance_areas (name, description, color) VALUES
  ('Procurement', 'Procurement process compliance and vendor management', '#3b82f6'),
  ('Financial', 'Financial controls and reporting compliance', '#10b981'),
  ('Vendor Management', 'Vendor qualification and performance compliance', '#f59e0b'),
  ('Data Privacy', 'Data protection and privacy regulations', '#8b5cf6'),
  ('Security', 'Information security and access controls', '#ef4444');