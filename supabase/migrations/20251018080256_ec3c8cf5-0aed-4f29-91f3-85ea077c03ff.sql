-- Create compliance_policies table
CREATE TABLE IF NOT EXISTS public.compliance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  effective_date DATE NOT NULL,
  review_date DATE NOT NULL,
  owner TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'review', 'archived')),
  compliance_rate NUMERIC,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.compliance_policies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all policies"
  ON public.compliance_policies
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Authenticated users can view policies"
  ON public.compliance_policies
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX idx_compliance_policies_status ON public.compliance_policies(status);
CREATE INDEX idx_compliance_policies_category ON public.compliance_policies(category);
CREATE INDEX idx_compliance_policies_review_date ON public.compliance_policies(review_date);

-- Trigger for updated_at
CREATE TRIGGER update_compliance_policies_updated_at
  BEFORE UPDATE ON public.compliance_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();