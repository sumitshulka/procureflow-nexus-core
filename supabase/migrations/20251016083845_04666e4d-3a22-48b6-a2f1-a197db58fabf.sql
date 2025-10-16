-- Create risk_categories table for risk classification
CREATE TABLE IF NOT EXISTS public.risk_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#94a3b8',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create risk_assessments table
CREATE TABLE IF NOT EXISTS public.risk_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.risk_categories(id) ON DELETE SET NULL,
  probability INTEGER NOT NULL CHECK (probability >= 1 AND probability <= 5),
  impact INTEGER NOT NULL CHECK (impact >= 1 AND impact <= 5),
  risk_score INTEGER GENERATED ALWAYS AS (probability * impact) STORED,
  risk_level TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN (probability * impact) >= 15 THEN 'Critical'
      WHEN (probability * impact) >= 10 THEN 'High'
      WHEN (probability * impact) >= 5 THEN 'Medium'
      ELSE 'Low'
    END
  ) STORED,
  mitigation_strategy TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Under Review', 'Mitigated', 'Accepted', 'Closed')),
  due_date TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create risk_metrics table for tracking risk changes over time
CREATE TABLE IF NOT EXISTS public.risk_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id UUID NOT NULL REFERENCES public.risk_assessments(id) ON DELETE CASCADE,
  metric_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  probability INTEGER NOT NULL CHECK (probability >= 1 AND probability <= 5),
  impact INTEGER NOT NULL CHECK (impact >= 1 AND impact <= 5),
  risk_score INTEGER GENERATED ALWAYS AS (probability * impact) STORED,
  mitigation_progress INTEGER DEFAULT 0 CHECK (mitigation_progress >= 0 AND mitigation_progress <= 100),
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create risk_mitigation_actions table
CREATE TABLE IF NOT EXISTS public.risk_mitigation_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id UUID NOT NULL REFERENCES public.risk_assessments(id) ON DELETE CASCADE,
  action_title TEXT NOT NULL,
  action_description TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  completion_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'In Progress', 'Completed', 'Cancelled', 'Overdue')),
  effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_risk_assessments_category ON public.risk_assessments(category_id);
CREATE INDEX idx_risk_assessments_status ON public.risk_assessments(status);
CREATE INDEX idx_risk_assessments_risk_level ON public.risk_assessments(risk_level);
CREATE INDEX idx_risk_assessments_owner ON public.risk_assessments(owner_id);
CREATE INDEX idx_risk_metrics_risk_id ON public.risk_metrics(risk_id);
CREATE INDEX idx_risk_metrics_date ON public.risk_metrics(metric_date);
CREATE INDEX idx_risk_mitigation_actions_risk_id ON public.risk_mitigation_actions(risk_id);
CREATE INDEX idx_risk_mitigation_actions_status ON public.risk_mitigation_actions(status);

-- Enable RLS on all tables
ALTER TABLE public.risk_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_mitigation_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for risk_categories
CREATE POLICY "Anyone can view active risk categories" ON public.risk_categories
  FOR SELECT USING (is_active = true OR auth.role() = 'authenticated');

CREATE POLICY "Admins can manage risk categories" ON public.risk_categories
  FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for risk_assessments
CREATE POLICY "Authenticated users can view risk assessments" ON public.risk_assessments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create risk assessments" ON public.risk_assessments
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins and risk owners can update assessments" ON public.risk_assessments
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::user_role) OR 
    auth.uid() = owner_id OR 
    auth.uid() = created_by
  );

CREATE POLICY "Admins can delete risk assessments" ON public.risk_assessments
  FOR DELETE USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for risk_metrics
CREATE POLICY "Authenticated users can view risk metrics" ON public.risk_metrics
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create risk metrics" ON public.risk_metrics
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own risk metrics" ON public.risk_metrics
  FOR UPDATE USING (auth.uid() = recorded_by);

-- RLS Policies for risk_mitigation_actions
CREATE POLICY "Authenticated users can view mitigation actions" ON public.risk_mitigation_actions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create mitigation actions" ON public.risk_mitigation_actions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Assigned users and admins can update actions" ON public.risk_mitigation_actions
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::user_role) OR 
    auth.uid() = assigned_to OR 
    auth.uid() = created_by
  );

CREATE POLICY "Admins can delete mitigation actions" ON public.risk_mitigation_actions
  FOR DELETE USING (has_role(auth.uid(), 'admin'::user_role));

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_risk_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_risk_categories_updated_at
  BEFORE UPDATE ON public.risk_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_risk_updated_at();

CREATE TRIGGER update_risk_assessments_updated_at
  BEFORE UPDATE ON public.risk_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_risk_updated_at();

CREATE TRIGGER update_risk_mitigation_actions_updated_at
  BEFORE UPDATE ON public.risk_mitigation_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_risk_updated_at();

-- Insert default risk categories
INSERT INTO public.risk_categories (name, description, color) VALUES
  ('Vendor', 'Risks related to vendor relationships and dependencies', '#0088FE'),
  ('Financial', 'Financial and budget-related risks', '#00C49F'),
  ('Operational', 'Operational and process-related risks', '#FFBB28'),
  ('Compliance', 'Regulatory and compliance risks', '#FF8042'),
  ('Technology', 'Technology and system-related risks', '#8884D8')
ON CONFLICT (name) DO NOTHING;