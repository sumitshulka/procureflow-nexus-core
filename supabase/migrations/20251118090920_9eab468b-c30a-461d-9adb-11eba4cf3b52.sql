-- Create invoice approval levels table (similar to PO approval levels)
CREATE TABLE IF NOT EXISTS public.invoice_approval_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number INTEGER NOT NULL,
  level_name TEXT NOT NULL,
  min_amount NUMERIC NOT NULL DEFAULT 0,
  max_amount NUMERIC,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create invoice approval matrix table
CREATE TABLE IF NOT EXISTS public.invoice_approval_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_level_id UUID NOT NULL REFERENCES public.invoice_approval_levels(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  approver_role user_role,
  approver_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sequence_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  vendor_id UUID NOT NULL REFERENCES public.vendor_registrations(id) ON DELETE RESTRICT,
  invoice_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date TIMESTAMPTZ,
  currency TEXT NOT NULL DEFAULT 'USD',
  subtotal_amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  -- Status: submitted, disputed, under_approval, rejected, approved, paid
  
  -- Non-PO invoice fields
  is_non_po_invoice BOOLEAN NOT NULL DEFAULT false,
  non_po_justification TEXT,
  
  -- Dispute and rejection fields
  disputed_reason TEXT,
  disputed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  disputed_at TIMESTAMPTZ,
  rejected_reason TEXT,
  rejected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  corrective_action_required TEXT,
  
  -- Payment fields
  payment_date TIMESTAMPTZ,
  payment_reference TEXT,
  payment_method TEXT,
  payment_notes TEXT,
  paid_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Approval tracking
  approval_status TEXT DEFAULT 'pending',
  current_approval_level INTEGER,
  submitted_for_approval_at TIMESTAMPTZ,
  
  -- Signatory details
  signatory_name TEXT,
  signatory_designation TEXT,
  
  -- Attachments (PDF invoice)
  invoice_pdf_url TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Additional fields
  notes TEXT,
  terms_and_conditions TEXT,
  
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create invoice items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  po_item_id UUID REFERENCES public.purchase_order_items(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  discount_rate NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_price NUMERIC NOT NULL,
  final_amount NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create invoice approval history table
CREATE TABLE IF NOT EXISTS public.invoice_approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  approval_level_id UUID NOT NULL REFERENCES public.invoice_approval_levels(id) ON DELETE RESTRICT,
  approver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending',
  comments TEXT,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_vendor_id ON public.invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_po_id ON public.invoices(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_approval_history_invoice_id ON public.invoice_approval_history(invoice_id);

-- Create function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part TEXT;
    sequence_number INTEGER;
    new_number TEXT;
BEGIN
    year_part := to_char(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 8) AS INTEGER)), 0) + 1
    INTO sequence_number
    FROM invoices
    WHERE invoice_number LIKE 'INV-' || year_part || '-%';
    
    new_number := 'INV-' || year_part || '-' || LPAD(sequence_number::TEXT, 4, '0');
    NEW.invoice_number := new_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for invoice number generation
DROP TRIGGER IF EXISTS generate_invoice_number_trigger ON public.invoices;
CREATE TRIGGER generate_invoice_number_trigger
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION public.generate_invoice_number();

-- Create function to get required invoice approval level
CREATE OR REPLACE FUNCTION public.get_required_invoice_approval_level(invoice_amount NUMERIC)
RETURNS UUID AS $$
DECLARE
  level_id UUID;
BEGIN
  SELECT id INTO level_id
  FROM public.invoice_approval_levels
  WHERE is_active = true
    AND invoice_amount >= min_amount
    AND (max_amount IS NULL OR invoice_amount < max_amount)
  ORDER BY level_number ASC
  LIMIT 1;
  
  RETURN level_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Create function to initiate invoice approval
CREATE OR REPLACE FUNCTION public.initiate_invoice_approval(p_invoice_id UUID)
RETURNS JSONB AS $$
DECLARE
  invoice_record RECORD;
  required_level_id UUID;
  approver_record RECORD;
  result JSONB;
BEGIN
  -- Get invoice details
  SELECT * INTO invoice_record
  FROM public.invoices
  WHERE id = p_invoice_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invoice not found');
  END IF;
  
  -- Determine required approval level
  required_level_id := public.get_required_invoice_approval_level(invoice_record.total_amount);
  
  IF required_level_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No approval level configured for this amount');
  END IF;
  
  -- Get approvers for this level
  FOR approver_record IN
    SELECT DISTINCT 
      iam.approver_user_id,
      iam.approver_role,
      iam.department_id,
      ial.level_number
    FROM public.invoice_approval_matrix iam
    JOIN public.invoice_approval_levels ial ON ial.id = iam.approval_level_id
    WHERE iam.approval_level_id = required_level_id
      AND iam.is_active = true
    ORDER BY iam.sequence_order
  LOOP
    -- Create approval record for each approver
    INSERT INTO public.invoice_approval_history (
      invoice_id,
      approval_level_id,
      approver_id,
      status
    ) VALUES (
      p_invoice_id,
      required_level_id,
      approver_record.approver_user_id,
      'pending'
    );
  END LOOP;
  
  -- Update invoice status
  UPDATE public.invoices
  SET 
    approval_status = 'pending_approval',
    status = 'under_approval',
    current_approval_level = (SELECT level_number FROM public.invoice_approval_levels WHERE id = required_level_id),
    submitted_for_approval_at = now()
  WHERE id = p_invoice_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Invoice submitted for approval',
    'approval_level_id', required_level_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_updated_at();

DROP TRIGGER IF EXISTS update_invoice_approval_levels_updated_at ON public.invoice_approval_levels;
CREATE TRIGGER update_invoice_approval_levels_updated_at
  BEFORE UPDATE ON public.invoice_approval_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_updated_at();

DROP TRIGGER IF EXISTS update_invoice_approval_matrix_updated_at ON public.invoice_approval_matrix;
CREATE TRIGGER update_invoice_approval_matrix_updated_at
  BEFORE UPDATE ON public.invoice_approval_matrix
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_updated_at();

-- Enable RLS on all tables
ALTER TABLE public.invoice_approval_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_approval_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_approval_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoice_approval_levels
CREATE POLICY "Admins can manage invoice approval levels"
  ON public.invoice_approval_levels
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'finance_officer'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'finance_officer'::user_role));

CREATE POLICY "Users can view invoice approval levels"
  ON public.invoice_approval_levels
  FOR SELECT
  USING (true);

-- RLS Policies for invoice_approval_matrix
CREATE POLICY "Admins can manage invoice approval matrix"
  ON public.invoice_approval_matrix
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'finance_officer'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'finance_officer'::user_role));

CREATE POLICY "Users can view invoice approval matrix"
  ON public.invoice_approval_matrix
  FOR SELECT
  USING (true);

-- RLS Policies for invoices
CREATE POLICY "Vendors can create and view their own invoices"
  ON public.invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM vendor_registrations vr
      WHERE vr.id = invoices.vendor_id AND vr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendor_registrations vr
      WHERE vr.id = invoices.vendor_id AND vr.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and finance can manage all invoices"
  ON public.invoices
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'finance_officer'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'finance_officer'::user_role));

CREATE POLICY "Approvers can view invoices pending their approval"
  ON public.invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoice_approval_history iah
      WHERE iah.invoice_id = invoices.id 
      AND iah.approver_id = auth.uid()
    )
  );

-- RLS Policies for invoice_items
CREATE POLICY "Users can view invoice items for accessible invoices"
  ON public.invoice_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_items.invoice_id
      AND (
        has_role(auth.uid(), 'admin'::user_role) OR
        has_role(auth.uid(), 'finance_officer'::user_role) OR
        EXISTS (
          SELECT 1 FROM vendor_registrations vr
          WHERE vr.id = i.vendor_id AND vr.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Authorized users can manage invoice items"
  ON public.invoice_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_items.invoice_id
      AND (
        has_role(auth.uid(), 'admin'::user_role) OR
        has_role(auth.uid(), 'finance_officer'::user_role) OR
        (
          EXISTS (
            SELECT 1 FROM vendor_registrations vr
            WHERE vr.id = i.vendor_id AND vr.user_id = auth.uid()
          )
          AND i.status = 'submitted'
        )
      )
    )
  );

-- RLS Policies for invoice_approval_history
CREATE POLICY "Users can view relevant approval history"
  ON public.invoice_approval_history
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::user_role) OR
    has_role(auth.uid(), 'finance_officer'::user_role) OR
    approver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_approval_history.invoice_id
      AND EXISTS (
        SELECT 1 FROM vendor_registrations vr
        WHERE vr.id = i.vendor_id AND vr.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Approvers can update their approval records"
  ON public.invoice_approval_history
  FOR UPDATE
  USING (approver_id = auth.uid())
  WITH CHECK (approver_id = auth.uid());

CREATE POLICY "System can insert approval history"
  ON public.invoice_approval_history
  FOR INSERT
  WITH CHECK (true);