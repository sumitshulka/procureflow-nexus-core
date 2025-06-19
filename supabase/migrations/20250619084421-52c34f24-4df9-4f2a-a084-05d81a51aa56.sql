
-- Create RFP templates table
CREATE TABLE public.rfp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  template_data JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0
);

-- Create RFP template fields table for dynamic fields
CREATE TABLE public.rfp_template_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.rfp_templates(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'textarea', 'select', 'number', 'date', 'checkbox', 'file')),
  field_options JSONB DEFAULT NULL, -- For select options, validation rules, etc.
  is_required BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(template_id, field_name)
);

-- Create RFP template values table to store actual RFP data based on templates
CREATE TABLE public.rfp_template_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfp_id UUID NOT NULL REFERENCES public.rfps(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.rfp_templates(id),
  field_name TEXT NOT NULL,
  field_value JSONB, -- Store any type of value
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(rfp_id, field_name)
);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_rfp_templates()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rfp_templates_updated_at
    BEFORE UPDATE ON public.rfp_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_rfp_templates();

CREATE TRIGGER trigger_update_rfp_template_values_updated_at
    BEFORE UPDATE ON public.rfp_template_values
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.rfp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfp_template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfp_template_values ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all active rfp templates" 
  ON public.rfp_templates 
  FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Authenticated users can create rfp templates" 
  ON public.rfp_templates 
  FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Template creators can update their templates" 
  ON public.rfp_templates 
  FOR UPDATE 
  USING (auth.uid() = created_by);

CREATE POLICY "Template creators can delete their templates" 
  ON public.rfp_templates 
  FOR DELETE 
  USING (auth.uid() = created_by);

-- RFP template fields policies
CREATE POLICY "Users can view template fields for active templates" 
  ON public.rfp_template_fields 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.rfp_templates rt 
    WHERE rt.id = template_id AND rt.is_active = true
  ));

CREATE POLICY "Authenticated users can manage template fields" 
  ON public.rfp_template_fields 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.rfp_templates rt 
    WHERE rt.id = template_id AND rt.created_by = auth.uid()
  ));

-- RFP template values policies
CREATE POLICY "Users can view rfp template values for their rfps" 
  ON public.rfp_template_values 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.rfps r 
    WHERE r.id = rfp_id AND r.created_by = auth.uid()
  ));

CREATE POLICY "Users can manage rfp template values for their rfps" 
  ON public.rfp_template_values 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.rfps r 
    WHERE r.id = rfp_id AND r.created_by = auth.uid()
  ));

-- Add index for better performance
CREATE INDEX idx_rfp_templates_category ON public.rfp_templates(category);
CREATE INDEX idx_rfp_templates_is_active ON public.rfp_templates(is_active);
CREATE INDEX idx_rfp_template_fields_template_id ON public.rfp_template_fields(template_id);
CREATE INDEX idx_rfp_template_fields_display_order ON public.rfp_template_fields(template_id, display_order);
CREATE INDEX idx_rfp_template_values_rfp_id ON public.rfp_template_values(rfp_id);
CREATE INDEX idx_rfp_template_values_template_id ON public.rfp_template_values(template_id);
