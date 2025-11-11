-- Add terms and conditions and specific instructions to purchase_orders table
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT,
ADD COLUMN IF NOT EXISTS specific_instructions TEXT;

-- Create standard PO settings table for storing default terms, instructions, and email templates
CREATE TABLE IF NOT EXISTS standard_po_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  standard_terms_and_conditions TEXT,
  standard_specific_instructions TEXT,
  email_template_subject TEXT DEFAULT 'Purchase Order - {{po_number}}',
  email_template_body TEXT DEFAULT 'Dear {{vendor_name}},

Please find attached Purchase Order {{po_number}} for your review and processing.

PO Details:
- PO Number: {{po_number}}
- Total Amount: {{total_amount}} {{currency}}
- Expected Delivery: {{expected_delivery}}

Please acknowledge receipt of this PO and confirm the delivery schedule.

Best regards,
{{sender_name}}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE standard_po_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for standard_po_settings
CREATE POLICY "Authenticated users can view standard PO settings"
  ON standard_po_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can manage standard PO settings"
  ON standard_po_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN custom_roles cr ON ura.custom_role_id = cr.id
      WHERE ura.user_id = auth.uid()
      AND cr.name IN ('Admin', 'Super Admin')
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_standard_po_settings_updated_at
  BEFORE UPDATE ON standard_po_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create email logs table to track sent PO emails
CREATE TABLE IF NOT EXISTS po_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'sent',
  error_message TEXT
);

-- Enable RLS
ALTER TABLE po_email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for po_email_logs
CREATE POLICY "Users can view their sent PO emails"
  ON po_email_logs FOR SELECT
  TO authenticated
  USING (
    sent_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN custom_roles cr ON ura.custom_role_id = cr.id
      WHERE ura.user_id = auth.uid()
      AND cr.name IN ('Admin', 'Super Admin', 'Procurement Manager')
    )
  );

CREATE POLICY "Users can insert PO email logs"
  ON po_email_logs FOR INSERT
  TO authenticated
  WITH CHECK (sent_by = auth.uid());