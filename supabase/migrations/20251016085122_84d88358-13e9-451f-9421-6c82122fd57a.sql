-- Create enum for budget period types
CREATE TYPE budget_period_type AS ENUM ('monthly', 'quarterly');

-- Create enum for budget cycle status
CREATE TYPE budget_cycle_status AS ENUM ('draft', 'open', 'closed', 'archived');

-- Create enum for budget allocation status
CREATE TYPE budget_allocation_status AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected');

-- Budget Cycles Table
CREATE TABLE public.budget_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  period_type budget_period_type NOT NULL DEFAULT 'monthly',
  status budget_cycle_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget Heads (Standard categories set by admin)
CREATE TABLE public.budget_heads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  code TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget Allocations (Department submissions)
CREATE TABLE public.budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.budget_cycles(id) ON DELETE CASCADE,
  head_id UUID NOT NULL REFERENCES public.budget_heads(id),
  department_id UUID REFERENCES public.departments(id),
  period_number INTEGER NOT NULL, -- 1-12 for monthly, 1-4 for quarterly
  allocated_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  approved_amount NUMERIC(15,2),
  status budget_allocation_status NOT NULL DEFAULT 'draft',
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cycle_id, head_id, department_id, period_number)
);

-- Budget Line Items (Detailed items under each allocation)
CREATE TABLE public.budget_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id UUID NOT NULL REFERENCES public.budget_allocations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  justification TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.budget_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for budget_cycles
CREATE POLICY "Admins can manage budget cycles"
  ON public.budget_cycles FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can view open budget cycles"
  ON public.budget_cycles FOR SELECT
  USING (status IN ('open', 'closed'));

-- RLS Policies for budget_heads
CREATE POLICY "Admins can manage budget heads"
  ON public.budget_heads FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can view active budget heads"
  ON public.budget_heads FOR SELECT
  USING (is_active = true);

-- RLS Policies for budget_allocations
CREATE POLICY "Admins can manage all allocations"
  ON public.budget_allocations FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Department managers can create allocations for their department"
  ON public.budget_allocations FOR INSERT
  WITH CHECK (
    department_id IN (
      SELECT department_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own draft allocations"
  ON public.budget_allocations FOR UPDATE
  USING (submitted_by = auth.uid() AND status = 'draft');

CREATE POLICY "Users can view their department allocations"
  ON public.budget_allocations FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::user_role) OR
    department_id IN (
      SELECT department_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for budget_line_items
CREATE POLICY "Users can manage line items for their allocations"
  ON public.budget_line_items FOR ALL
  USING (
    allocation_id IN (
      SELECT id FROM public.budget_allocations
      WHERE submitted_by = auth.uid() AND status = 'draft'
    )
  );

CREATE POLICY "Users can view line items for visible allocations"
  ON public.budget_line_items FOR SELECT
  USING (
    allocation_id IN (
      SELECT id FROM public.budget_allocations
      WHERE has_role(auth.uid(), 'admin'::user_role) OR
      department_id IN (
        SELECT department_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_budget_cycles_updated_at
  BEFORE UPDATE ON public.budget_cycles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_heads_updated_at
  BEFORE UPDATE ON public.budget_heads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_allocations_updated_at
  BEFORE UPDATE ON public.budget_allocations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_line_items_updated_at
  BEFORE UPDATE ON public.budget_line_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_budget_cycles_status ON public.budget_cycles(status);
CREATE INDEX idx_budget_cycles_fiscal_year ON public.budget_cycles(fiscal_year);
CREATE INDEX idx_budget_heads_active ON public.budget_heads(is_active);
CREATE INDEX idx_budget_allocations_cycle ON public.budget_allocations(cycle_id);
CREATE INDEX idx_budget_allocations_department ON public.budget_allocations(department_id);
CREATE INDEX idx_budget_allocations_status ON public.budget_allocations(status);
CREATE INDEX idx_budget_line_items_allocation ON public.budget_line_items(allocation_id);