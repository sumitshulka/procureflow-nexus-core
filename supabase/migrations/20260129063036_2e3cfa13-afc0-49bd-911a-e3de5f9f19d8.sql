-- =====================================================
-- GRN (Goods Received Notes) Management Module
-- =====================================================

-- Create enum for GRN status
CREATE TYPE grn_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'cancelled'
);

-- Create enum for delivery status (for PO tracking)
CREATE TYPE po_delivery_status AS ENUM (
  'pending',
  'partially_received',
  'fully_received'
);

-- =====================================================
-- Main GRN Table
-- =====================================================
CREATE TABLE goods_received_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number TEXT NOT NULL UNIQUE,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  vendor_id UUID NOT NULL REFERENCES vendor_registrations(id) ON DELETE RESTRICT,
  
  -- Receipt details
  receipt_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  warehouse_id UUID REFERENCES warehouses(id),
  received_by UUID NOT NULL,
  
  -- Approval workflow
  status grn_status NOT NULL DEFAULT 'draft',
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_comments TEXT,
  rejected_by UUID,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  -- Additional info
  remarks TEXT,
  discrepancies TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Vendor portal visibility
  is_published_to_vendor BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- GRN Line Items
-- =====================================================
CREATE TABLE grn_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID NOT NULL REFERENCES goods_received_notes(id) ON DELETE CASCADE,
  po_item_id UUID NOT NULL REFERENCES purchase_order_items(id) ON DELETE RESTRICT,
  product_id UUID REFERENCES products(id),
  
  -- Quantities
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER NOT NULL,
  quantity_accepted INTEGER NOT NULL DEFAULT 0,
  quantity_rejected INTEGER NOT NULL DEFAULT 0,
  
  -- Pricing (for value calculation)
  unit_price NUMERIC(15, 2) NOT NULL,
  total_value NUMERIC(15, 2) NOT NULL,
  
  -- Item details
  description TEXT NOT NULL,
  batch_number TEXT,
  serial_numbers TEXT[],
  expiry_date DATE,
  
  -- Condition notes
  condition_remarks TEXT,
  rejection_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- GRN-Invoice Linking Table (Many-to-Many)
-- =====================================================
CREATE TABLE grn_invoice_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID NOT NULL REFERENCES goods_received_notes(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  linked_by UUID NOT NULL,
  linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  
  UNIQUE(grn_id, invoice_id)
);

-- =====================================================
-- 3-Way Matching Settings
-- =====================================================
CREATE TABLE matching_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tolerance settings
  price_tolerance_percentage NUMERIC(5, 2) DEFAULT 2.00,
  quantity_tolerance_percentage NUMERIC(5, 2) DEFAULT 0.00,
  tax_tolerance_percentage NUMERIC(5, 2) DEFAULT 1.00,
  total_tolerance_percentage NUMERIC(5, 2) DEFAULT 2.00,
  
  -- Control flags
  strict_matching_mode BOOLEAN DEFAULT false,
  allow_over_receipt BOOLEAN DEFAULT false,
  require_grn_for_invoice BOOLEAN DEFAULT true,
  auto_approve_matched BOOLEAN DEFAULT false,
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default matching settings
INSERT INTO matching_settings (id, price_tolerance_percentage, quantity_tolerance_percentage, strict_matching_mode)
VALUES (gen_random_uuid(), 2.00, 0.00, false);

-- =====================================================
-- PO Item Received Quantities Tracking View
-- =====================================================
CREATE OR REPLACE VIEW po_item_receipt_status AS
SELECT 
  poi.id AS po_item_id,
  poi.po_id,
  poi.product_id,
  poi.description,
  poi.quantity AS quantity_ordered,
  COALESCE(SUM(CASE WHEN grn.status = 'approved' THEN gi.quantity_accepted ELSE 0 END), 0) AS quantity_received,
  poi.quantity - COALESCE(SUM(CASE WHEN grn.status = 'approved' THEN gi.quantity_accepted ELSE 0 END), 0) AS quantity_pending,
  poi.unit_price,
  poi.total_price AS ordered_value,
  COALESCE(SUM(CASE WHEN grn.status = 'approved' THEN gi.total_value ELSE 0 END), 0) AS received_value
FROM purchase_order_items poi
LEFT JOIN grn_items gi ON gi.po_item_id = poi.id
LEFT JOIN goods_received_notes grn ON grn.id = gi.grn_id
GROUP BY poi.id, poi.po_id, poi.product_id, poi.description, poi.quantity, poi.unit_price, poi.total_price;

-- =====================================================
-- PO Delivery Status Summary View
-- =====================================================
CREATE OR REPLACE VIEW po_delivery_summary AS
SELECT 
  po.id AS po_id,
  po.po_number,
  po.vendor_id,
  po.status AS po_status,
  po.final_amount AS po_value,
  COUNT(DISTINCT grn.id) FILTER (WHERE grn.status = 'approved') AS grn_count,
  SUM(poi.quantity) AS total_ordered,
  COALESCE(SUM(pirs.quantity_received), 0) AS total_received,
  SUM(poi.quantity) - COALESCE(SUM(pirs.quantity_received), 0) AS total_pending,
  CASE 
    WHEN COALESCE(SUM(pirs.quantity_received), 0) = 0 THEN 'pending'
    WHEN COALESCE(SUM(pirs.quantity_received), 0) >= SUM(poi.quantity) THEN 'fully_received'
    ELSE 'partially_received'
  END AS delivery_status
FROM purchase_orders po
LEFT JOIN purchase_order_items poi ON poi.po_id = po.id
LEFT JOIN po_item_receipt_status pirs ON pirs.po_item_id = poi.id
LEFT JOIN goods_received_notes grn ON grn.purchase_order_id = po.id
GROUP BY po.id, po.po_number, po.vendor_id, po.status, po.final_amount;

-- =====================================================
-- 3-Way Match Results View
-- =====================================================
CREATE OR REPLACE VIEW three_way_match_results AS
SELECT 
  inv.id AS invoice_id,
  inv.invoice_number,
  inv.vendor_id,
  inv.purchase_order_id,
  inv.total_amount AS invoice_amount,
  po.po_number,
  po.final_amount AS po_amount,
  COALESCE(grn_totals.grn_value, 0) AS grn_value,
  COALESCE(grn_totals.grn_count, 0) AS linked_grn_count,
  -- Variance calculations
  inv.total_amount - po.final_amount AS po_variance,
  inv.total_amount - COALESCE(grn_totals.grn_value, 0) AS grn_variance,
  -- Variance percentages
  CASE WHEN po.final_amount > 0 
    THEN ((inv.total_amount - po.final_amount) / po.final_amount * 100)
    ELSE 0 
  END AS po_variance_percent,
  CASE WHEN grn_totals.grn_value > 0 
    THEN ((inv.total_amount - grn_totals.grn_value) / grn_totals.grn_value * 100)
    ELSE 0 
  END AS grn_variance_percent
FROM invoices inv
LEFT JOIN purchase_orders po ON po.id = inv.purchase_order_id
LEFT JOIN (
  SELECT 
    gil.invoice_id,
    COUNT(DISTINCT gil.grn_id) AS grn_count,
    SUM(gi.total_value) AS grn_value
  FROM grn_invoice_links gil
  JOIN goods_received_notes grn ON grn.id = gil.grn_id AND grn.status = 'approved'
  JOIN grn_items gi ON gi.grn_id = grn.id
  GROUP BY gil.invoice_id
) grn_totals ON grn_totals.invoice_id = inv.id
WHERE inv.purchase_order_id IS NOT NULL;

-- =====================================================
-- Add delivery tracking columns to purchase_orders
-- =====================================================
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS total_received_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_received_value NUMERIC(15, 2) DEFAULT 0;

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX idx_grn_po_id ON goods_received_notes(purchase_order_id);
CREATE INDEX idx_grn_vendor_id ON goods_received_notes(vendor_id);
CREATE INDEX idx_grn_status ON goods_received_notes(status);
CREATE INDEX idx_grn_receipt_date ON goods_received_notes(receipt_date);
CREATE INDEX idx_grn_items_grn_id ON grn_items(grn_id);
CREATE INDEX idx_grn_items_po_item_id ON grn_items(po_item_id);
CREATE INDEX idx_grn_invoice_links_grn_id ON grn_invoice_links(grn_id);
CREATE INDEX idx_grn_invoice_links_invoice_id ON grn_invoice_links(invoice_id);

-- =====================================================
-- Enable RLS
-- =====================================================
ALTER TABLE goods_received_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE grn_invoice_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies for goods_received_notes
-- =====================================================
CREATE POLICY "Users can view all GRNs" ON goods_received_notes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create GRNs" ON goods_received_notes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update GRNs" ON goods_received_notes
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete draft GRNs" ON goods_received_notes
  FOR DELETE USING (auth.uid() IS NOT NULL AND status = 'draft');

-- =====================================================
-- RLS Policies for grn_items
-- =====================================================
CREATE POLICY "Users can view all GRN items" ON grn_items
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage GRN items" ON grn_items
  FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- RLS Policies for grn_invoice_links
-- =====================================================
CREATE POLICY "Users can view all GRN-Invoice links" ON grn_invoice_links
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage GRN-Invoice links" ON grn_invoice_links
  FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- RLS Policies for matching_settings
-- =====================================================
CREATE POLICY "Users can view matching settings" ON matching_settings
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can update matching settings" ON matching_settings
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- =====================================================
-- Function to generate GRN number
-- =====================================================
CREATE OR REPLACE FUNCTION generate_grn_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  year_str TEXT;
  sequence_num INTEGER;
BEGIN
  year_str := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CASE 
      WHEN grn_number ~ ('^GRN-' || year_str || '-[0-9]+$')
      THEN CAST(SUBSTRING(grn_number FROM '[0-9]+$') AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_num
  FROM goods_received_notes;
  
  new_number := 'GRN-' || year_str || '-' || LPAD(sequence_num::TEXT, 5, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function to update PO delivery status after GRN approval
-- =====================================================
CREATE OR REPLACE FUNCTION update_po_delivery_status()
RETURNS TRIGGER AS $$
DECLARE
  total_ordered INTEGER;
  total_received INTEGER;
  new_status TEXT;
BEGIN
  -- Only process if GRN status changed to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Calculate totals from the view
    SELECT 
      COALESCE(SUM(quantity_ordered), 0),
      COALESCE(SUM(quantity_received), 0)
    INTO total_ordered, total_received
    FROM po_item_receipt_status
    WHERE po_id = NEW.purchase_order_id;
    
    -- Determine status
    IF total_received = 0 THEN
      new_status := 'pending';
    ELSIF total_received >= total_ordered THEN
      new_status := 'fully_received';
    ELSE
      new_status := 'partially_received';
    END IF;
    
    -- Update the PO
    UPDATE purchase_orders
    SET 
      delivery_status = new_status,
      total_received_quantity = total_received,
      updated_at = now()
    WHERE id = NEW.purchase_order_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for PO status update
CREATE TRIGGER trg_update_po_delivery_status
AFTER INSERT OR UPDATE OF status ON goods_received_notes
FOR EACH ROW
EXECUTE FUNCTION update_po_delivery_status();

-- =====================================================
-- Function to create inventory transaction on GRN approval
-- =====================================================
CREATE OR REPLACE FUNCTION create_grn_inventory_transaction()
RETURNS TRIGGER AS $$
DECLARE
  grn_item RECORD;
BEGIN
  -- Only process if GRN status changed to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Create inventory transactions for each accepted item
    FOR grn_item IN 
      SELECT gi.*, grn.warehouse_id, grn.received_by, grn.grn_number
      FROM grn_items gi
      JOIN goods_received_notes grn ON grn.id = gi.grn_id
      WHERE grn.id = NEW.id AND gi.quantity_accepted > 0 AND gi.product_id IS NOT NULL
    LOOP
      -- Insert stock-in transaction
      INSERT INTO inventory_transactions (
        product_id,
        type,
        quantity,
        target_warehouse_id,
        reference,
        user_id,
        notes,
        unit_price,
        transaction_date
      ) VALUES (
        grn_item.product_id,
        'stock_in',
        grn_item.quantity_accepted,
        grn_item.warehouse_id,
        'GRN: ' || grn_item.grn_number,
        grn_item.received_by,
        'Auto-created from GRN approval',
        grn_item.unit_price,
        now()
      );
      
      -- Update inventory item quantity
      INSERT INTO inventory_items (product_id, warehouse_id, quantity, last_updated)
      VALUES (grn_item.product_id, grn_item.warehouse_id, grn_item.quantity_accepted, now())
      ON CONFLICT (product_id, warehouse_id) 
      DO UPDATE SET 
        quantity = inventory_items.quantity + grn_item.quantity_accepted,
        last_updated = now();
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory update
CREATE TRIGGER trg_grn_inventory_transaction
AFTER INSERT OR UPDATE OF status ON goods_received_notes
FOR EACH ROW
EXECUTE FUNCTION create_grn_inventory_transaction();

-- =====================================================
-- Updated at trigger
-- =====================================================
CREATE TRIGGER update_grn_updated_at
BEFORE UPDATE ON goods_received_notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grn_items_updated_at
BEFORE UPDATE ON grn_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matching_settings_updated_at
BEFORE UPDATE ON matching_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();