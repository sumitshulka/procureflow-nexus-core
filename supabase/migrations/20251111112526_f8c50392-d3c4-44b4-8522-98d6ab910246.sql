-- Create approval matrix configuration tables

-- Table to store approval levels and their budget thresholds
CREATE TABLE public.po_approval_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number INTEGER NOT NULL,
  level_name TEXT NOT NULL,
  min_amount NUMERIC NOT NULL DEFAULT 0,
  max_amount NUMERIC,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_level_number UNIQUE(level_number)
);

-- Table to assign approvers to levels based on department/role
CREATE TABLE public.po_approval_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_level_id UUID NOT NULL REFERENCES public.po_approval_levels(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  approver_role user_role,
  approver_user_id UUID,
  sequence_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to track PO approvals through the matrix
CREATE TABLE public.po_approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  approval_level_id UUID NOT NULL REFERENCES public.po_approval_levels(id),
  approver_id UUID NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Add approval_status column to purchase_orders if it doesn't exist
ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS current_approval_level INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS submitted_for_approval_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS
ALTER TABLE public.po_approval_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_approval_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_approval_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for po_approval_levels
CREATE POLICY "Admins can manage approval levels"
ON public.po_approval_levels
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'procurement_officer'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'procurement_officer'::user_role));

CREATE POLICY "Authenticated users can view approval levels"
ON public.po_approval_levels
FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for po_approval_matrix
CREATE POLICY "Admins can manage approval matrix"
ON public.po_approval_matrix
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'procurement_officer'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'procurement_officer'::user_role));

CREATE POLICY "Users can view approval matrix"
ON public.po_approval_matrix
FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for po_approval_history
CREATE POLICY "Admins and PO creators can view approval history"
ON public.po_approval_history
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'procurement_officer'::user_role) OR
  EXISTS (
    SELECT 1 FROM public.purchase_orders 
    WHERE id = po_approval_history.purchase_order_id 
    AND created_by = auth.uid()
  ) OR
  approver_id = auth.uid()
);

CREATE POLICY "System can insert approval history"
ON public.po_approval_history
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Approvers can update their approval records"
ON public.po_approval_history
FOR UPDATE
TO authenticated
USING (approver_id = auth.uid())
WITH CHECK (approver_id = auth.uid());

-- Create function to determine required approval level for a PO
CREATE OR REPLACE FUNCTION public.get_required_approval_level(po_amount NUMERIC)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  level_id UUID;
BEGIN
  SELECT id INTO level_id
  FROM public.po_approval_levels
  WHERE is_active = true
    AND po_amount >= min_amount
    AND (max_amount IS NULL OR po_amount < max_amount)
  ORDER BY level_number ASC
  LIMIT 1;
  
  RETURN level_id;
END;
$$;

-- Create function to initiate PO approval process
CREATE OR REPLACE FUNCTION public.initiate_po_approval(p_po_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  po_record RECORD;
  required_level_id UUID;
  approver_record RECORD;
  result JSONB;
BEGIN
  -- Get PO details
  SELECT * INTO po_record
  FROM public.purchase_orders
  WHERE id = p_po_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Purchase order not found');
  END IF;
  
  -- Determine required approval level
  required_level_id := public.get_required_approval_level(po_record.final_amount);
  
  IF required_level_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No approval level configured for this amount');
  END IF;
  
  -- Get approvers for this level
  FOR approver_record IN
    SELECT DISTINCT 
      pam.approver_user_id,
      pam.approver_role,
      pam.department_id,
      pal.level_number
    FROM public.po_approval_matrix pam
    JOIN public.po_approval_levels pal ON pal.id = pam.approval_level_id
    WHERE pam.approval_level_id = required_level_id
      AND pam.is_active = true
    ORDER BY pam.sequence_order
  LOOP
    -- Create approval record for each approver
    INSERT INTO public.po_approval_history (
      purchase_order_id,
      approval_level_id,
      approver_id,
      status
    ) VALUES (
      p_po_id,
      required_level_id,
      approver_record.approver_user_id,
      'pending'
    );
  END LOOP;
  
  -- Update PO status
  UPDATE public.purchase_orders
  SET 
    approval_status = 'pending_approval',
    current_approval_level = (SELECT level_number FROM public.po_approval_levels WHERE id = required_level_id),
    submitted_for_approval_at = now(),
    status = 'pending_approval'
  WHERE id = p_po_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'PO submitted for approval',
    'approval_level_id', required_level_id
  );
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_po_approval_levels_amount ON public.po_approval_levels(min_amount, max_amount);
CREATE INDEX idx_po_approval_matrix_level ON public.po_approval_matrix(approval_level_id);
CREATE INDEX idx_po_approval_history_po ON public.po_approval_history(purchase_order_id);
CREATE INDEX idx_po_approval_history_approver ON public.po_approval_history(approver_id, status);

COMMENT ON TABLE public.po_approval_levels IS 'Defines approval levels based on PO amount thresholds';
COMMENT ON TABLE public.po_approval_matrix IS 'Maps approvers to levels based on department and role';
COMMENT ON TABLE public.po_approval_history IS 'Tracks approval workflow history for each PO';