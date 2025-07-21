-- Create pricing templates table
CREATE TABLE public.pricing_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'general'
);

-- Enable RLS
ALTER TABLE public.pricing_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for pricing templates
CREATE POLICY "Users can view all active pricing templates" 
ON public.pricing_templates 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Authenticated users can create pricing templates" 
ON public.pricing_templates 
FOR INSERT 
WITH CHECK ((auth.uid() = created_by) AND (auth.uid() IS NOT NULL));

CREATE POLICY "Template creators can update their templates" 
ON public.pricing_templates 
FOR UPDATE 
USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'admin'::user_role))
WITH CHECK ((auth.uid() = created_by) OR has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Template creators can delete their templates" 
ON public.pricing_templates 
FOR DELETE 
USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'admin'::user_role));

-- Create pricing template fields table
CREATE TABLE public.pricing_template_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.pricing_templates(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL, -- 'number', 'text', 'dropdown', 'calculated'
  field_options JSONB,
  is_required BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  row_number INTEGER NOT NULL DEFAULT 1,
  column_number INTEGER NOT NULL DEFAULT 1,
  calculation_formula TEXT, -- For calculated fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  description TEXT
);

-- Enable RLS on pricing template fields
ALTER TABLE public.pricing_template_fields ENABLE ROW LEVEL SECURITY;

-- Create policies for pricing template fields
CREATE POLICY "Users can view template fields for active templates" 
ON public.pricing_template_fields 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.pricing_templates pt 
  WHERE pt.id = pricing_template_fields.template_id AND pt.is_active = true
));

CREATE POLICY "Authenticated users can manage template fields" 
ON public.pricing_template_fields 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.pricing_templates pt 
  WHERE pt.id = pricing_template_fields.template_id AND pt.created_by = auth.uid()
));