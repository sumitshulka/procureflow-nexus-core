-- Create email_templates table for centralized template management
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_key text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'general',
  subject_template text NOT NULL,
  body_template text NOT NULL,
  available_variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  is_system boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_email_templates_template_key ON email_templates(template_key);
CREATE INDEX idx_email_templates_category ON email_templates(category);
CREATE INDEX idx_email_templates_is_active ON email_templates(is_active);

-- Add RLS policies
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Admin can manage all templates
CREATE POLICY "Admins can manage email templates"
ON email_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- All authenticated users can view active templates
CREATE POLICY "Authenticated users can view active templates"
ON email_templates
FOR SELECT
USING (is_active = true);

-- Create trigger to update updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default templates
INSERT INTO email_templates (name, description, template_key, category, subject_template, body_template, available_variables, is_system) VALUES
('Purchase Order Email', 'Email sent to vendors when a purchase order is created', 'purchase_order', 'purchase_orders', 'Purchase Order - {{po_number}}', 'Dear {{vendor_name}},

Please find attached Purchase Order {{po_number}} for your review and processing.

PO Details:
- PO Number: {{po_number}}
- Total Amount: {{total_amount}} {{currency}}
- Expected Delivery: {{expected_delivery}}

Please acknowledge receipt of this PO and confirm the delivery schedule.

Best regards,
{{sender_name}}', 
'[{"name": "po_number", "description": "Purchase Order Number"}, {"name": "vendor_name", "description": "Vendor Company Name"}, {"name": "total_amount", "description": "Total PO Amount"}, {"name": "currency", "description": "Currency Code"}, {"name": "expected_delivery", "description": "Expected Delivery Date"}, {"name": "sender_name", "description": "Name of Person Sending Email"}]'::jsonb, true),

('Invoice Submission', 'Email sent when an invoice is submitted for approval', 'invoice_submitted', 'invoices', 'Invoice {{invoice_number}} Submitted for Approval', 'Dear {{approver_name}},

Invoice {{invoice_number}} has been submitted for your approval.

Invoice Details:
- Invoice Number: {{invoice_number}}
- Vendor: {{vendor_name}}
- Amount: {{total_amount}} {{currency}}
- Due Date: {{due_date}}

Please review and approve at your earliest convenience.

Best regards,
{{sender_name}}', 
'[{"name": "invoice_number", "description": "Invoice Number"}, {"name": "approver_name", "description": "Approver Name"}, {"name": "vendor_name", "description": "Vendor Name"}, {"name": "total_amount", "description": "Invoice Total"}, {"name": "currency", "description": "Currency"}, {"name": "due_date", "description": "Payment Due Date"}, {"name": "sender_name", "description": "Sender Name"}]'::jsonb, true),

('RFP Published', 'Email sent to vendors when an RFP is published', 'rfp_published', 'rfp', 'New RFP Published - {{rfp_number}}', 'Dear {{vendor_name}},

A new Request for Proposal has been published and is now available for your review.

RFP Details:
- RFP Number: {{rfp_number}}
- Title: {{rfp_title}}
- Submission Deadline: {{submission_deadline}}

Please log in to the vendor portal to view the complete RFP details and submit your response.

Best regards,
{{organization_name}}', 
'[{"name": "rfp_number", "description": "RFP Number"}, {"name": "vendor_name", "description": "Vendor Name"}, {"name": "rfp_title", "description": "RFP Title"}, {"name": "submission_deadline", "description": "Submission Deadline"}, {"name": "organization_name", "description": "Your Organization Name"}]'::jsonb, true),

('Welcome Email', 'Welcome email for new users', 'user_welcome', 'users', 'Welcome to {{organization_name}}', 'Dear {{user_name}},

Welcome to {{organization_name}}''s procurement system!

Your account has been successfully created. You can now log in and start using the platform.

Login Details:
- Email: {{user_email}}
- Portal: {{portal_url}}

If you have any questions, please contact our support team.

Best regards,
{{organization_name}} Team', 
'[{"name": "user_name", "description": "User Full Name"}, {"name": "user_email", "description": "User Email"}, {"name": "organization_name", "description": "Organization Name"}, {"name": "portal_url", "description": "Portal URL"}]'::jsonb, true);