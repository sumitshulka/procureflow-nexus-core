-- Create warehouse_transfers table for multi-step transfer workflow
CREATE TABLE public.warehouse_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_number VARCHAR(50) NOT NULL UNIQUE,
  source_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  target_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  status VARCHAR(50) NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'in_transit', 'received', 'partial_received', 'rejected', 'returned', 'cancelled')),
  
  -- Initiation details
  initiated_by UUID NOT NULL,
  initiated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  initiation_notes TEXT,
  
  -- Courier/Delivery details (outbound)
  courier_name VARCHAR(255),
  tracking_number VARCHAR(255),
  expected_delivery_date DATE,
  dispatch_date TIMESTAMP WITH TIME ZONE,
  
  -- Receipt details
  received_by UUID,
  received_at TIMESTAMP WITH TIME ZONE,
  receipt_notes TEXT,
  
  -- Return courier details (for rejected/returned items)
  return_courier_name VARCHAR(255),
  return_tracking_number VARCHAR(255),
  return_dispatch_date TIMESTAMP WITH TIME ZONE,
  return_received_at TIMESTAMP WITH TIME ZONE,
  return_received_by UUID,
  
  -- Attachments (delivery notes, photos, signed receipts)
  attachments JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT different_warehouses CHECK (source_warehouse_id != target_warehouse_id)
);

-- Create warehouse_transfer_items table for batch-level tracking
CREATE TABLE public.warehouse_transfer_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_id UUID NOT NULL REFERENCES public.warehouse_transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  batch_number VARCHAR(255) NOT NULL,
  expiry_date DATE,
  unit_price NUMERIC(15, 2),
  currency VARCHAR(10) DEFAULT 'USD',
  
  -- Quantities
  quantity_sent INTEGER NOT NULL CHECK (quantity_sent > 0),
  quantity_received INTEGER DEFAULT 0 CHECK (quantity_received >= 0),
  quantity_rejected INTEGER DEFAULT 0 CHECK (quantity_rejected >= 0),
  quantity_disposed INTEGER DEFAULT 0 CHECK (quantity_disposed >= 0),
  quantity_returned INTEGER DEFAULT 0 CHECK (quantity_returned >= 0),
  
  -- Status and reasons
  item_status VARCHAR(50) DEFAULT 'pending' CHECK (item_status IN ('pending', 'accepted', 'partial_accepted', 'rejected', 'disposed', 'returned')),
  rejection_reason TEXT,
  disposal_reason TEXT,
  condition_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create warehouse_transfer_logs for audit trail
CREATE TABLE public.warehouse_transfer_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_id UUID NOT NULL REFERENCES public.warehouse_transfers(id) ON DELETE CASCADE,
  transfer_item_id UUID REFERENCES public.warehouse_transfer_items(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  action_by UUID NOT NULL,
  action_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  details JSONB,
  ip_address VARCHAR(45),
  notes TEXT
);

-- Enable Row Level Security
ALTER TABLE public.warehouse_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_transfer_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for warehouse_transfers
CREATE POLICY "Users can view all transfers" 
ON public.warehouse_transfers 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create transfers" 
ON public.warehouse_transfers 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update transfers" 
ON public.warehouse_transfers 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Create policies for warehouse_transfer_items
CREATE POLICY "Users can view all transfer items" 
ON public.warehouse_transfer_items 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create transfer items" 
ON public.warehouse_transfer_items 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update transfer items" 
ON public.warehouse_transfer_items 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Create policies for warehouse_transfer_logs
CREATE POLICY "Users can view all transfer logs" 
ON public.warehouse_transfer_logs 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create transfer logs" 
ON public.warehouse_transfer_logs 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX idx_warehouse_transfers_status ON public.warehouse_transfers(status);
CREATE INDEX idx_warehouse_transfers_source ON public.warehouse_transfers(source_warehouse_id);
CREATE INDEX idx_warehouse_transfers_target ON public.warehouse_transfers(target_warehouse_id);
CREATE INDEX idx_warehouse_transfers_initiated_at ON public.warehouse_transfers(initiated_at DESC);
CREATE INDEX idx_warehouse_transfer_items_transfer ON public.warehouse_transfer_items(transfer_id);
CREATE INDEX idx_warehouse_transfer_items_product ON public.warehouse_transfer_items(product_id);
CREATE INDEX idx_warehouse_transfer_items_batch ON public.warehouse_transfer_items(batch_number);
CREATE INDEX idx_warehouse_transfer_logs_transfer ON public.warehouse_transfer_logs(transfer_id);

-- Function to generate transfer number
CREATE OR REPLACE FUNCTION public.generate_transfer_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.transfer_number := 'TRF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-generate transfer number
CREATE TRIGGER set_transfer_number
BEFORE INSERT ON public.warehouse_transfers
FOR EACH ROW
WHEN (NEW.transfer_number IS NULL OR NEW.transfer_number = '')
EXECUTE FUNCTION public.generate_transfer_number();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_warehouse_transfer_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for timestamp updates
CREATE TRIGGER update_warehouse_transfers_updated_at
BEFORE UPDATE ON public.warehouse_transfers
FOR EACH ROW
EXECUTE FUNCTION public.update_warehouse_transfer_timestamp();

CREATE TRIGGER update_warehouse_transfer_items_updated_at
BEFORE UPDATE ON public.warehouse_transfer_items
FOR EACH ROW
EXECUTE FUNCTION public.update_warehouse_transfer_timestamp();