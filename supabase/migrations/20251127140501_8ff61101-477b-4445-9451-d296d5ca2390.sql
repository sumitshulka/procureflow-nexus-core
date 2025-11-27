-- Create notification events table to map templates to system events
CREATE TABLE IF NOT EXISTS public.notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_key VARCHAR(100) NOT NULL UNIQUE,
    event_name TEXT NOT NULL,
    event_category TEXT NOT NULL,
    description TEXT,
    template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
    recipient_config JSONB DEFAULT '{"type": "manual", "recipients": []}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

-- Policies for notification_events
CREATE POLICY "Admins can manage notification events"
    ON public.notification_events
    FOR ALL
    USING (has_role(auth.uid(), 'admin'::user_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Authenticated users can view notification events"
    ON public.notification_events
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Update trigger
CREATE TRIGGER update_notification_events_updated_at
    BEFORE UPDATE ON public.notification_events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default notification events
INSERT INTO public.notification_events (event_key, event_name, event_category, description, recipient_config, is_system) VALUES
-- Purchase Order Events
('po_created', 'Purchase Order Created', 'purchase_orders', 'Triggered when a new purchase order is created', '{"type": "vendor", "additional_recipients": []}', true),
('po_approved', 'Purchase Order Approved', 'purchase_orders', 'Triggered when a purchase order is approved', '{"type": "vendor", "additional_recipients": []}', true),
('po_sent_to_vendor', 'Purchase Order Sent to Vendor', 'purchase_orders', 'Triggered when PO is sent to vendor', '{"type": "vendor", "additional_recipients": []}', true),
('po_acknowledged', 'Purchase Order Acknowledged', 'purchase_orders', 'Triggered when vendor acknowledges PO', '{"type": "creator", "additional_recipients": []}', true),

-- Invoice Events
('invoice_submitted', 'Invoice Submitted', 'invoices', 'Triggered when vendor submits an invoice', '{"type": "roles", "roles": ["admin", "finance_officer"], "additional_recipients": []}', true),
('invoice_approved', 'Invoice Approved', 'invoices', 'Triggered when an invoice is approved', '{"type": "vendor", "additional_recipients": []}', true),
('invoice_rejected', 'Invoice Rejected', 'invoices', 'Triggered when an invoice is rejected', '{"type": "vendor", "additional_recipients": []}', true),
('invoice_paid', 'Invoice Paid', 'invoices', 'Triggered when an invoice payment is completed', '{"type": "vendor", "additional_recipients": []}', true),

-- RFP Events
('rfp_published', 'RFP Published', 'rfp', 'Triggered when an RFP is published', '{"type": "invited_vendors", "additional_recipients": []}', true),
('rfp_addendum_published', 'RFP Addendum Published', 'rfp', 'Triggered when an RFP addendum is published', '{"type": "invited_vendors", "additional_recipients": []}', true),
('rfp_deadline_approaching', 'RFP Deadline Approaching', 'rfp', 'Triggered 24 hours before RFP submission deadline', '{"type": "invited_vendors", "additional_recipients": []}', true),
('rfp_response_received', 'RFP Response Received', 'rfp', 'Triggered when a vendor submits an RFP response', '{"type": "creator", "additional_recipients": []}', true),

-- User Management Events
('user_created', 'User Account Created', 'users', 'Triggered when a new user account is created', '{"type": "user", "additional_recipients": []}', true),
('password_reset_requested', 'Password Reset Requested', 'users', 'Triggered when user requests password reset', '{"type": "user", "additional_recipients": []}', true),
('user_role_changed', 'User Role Changed', 'users', 'Triggered when user role is modified', '{"type": "user", "additional_recipients": []}', true),

-- Vendor Management Events
('vendor_registered', 'Vendor Registration Submitted', 'vendors', 'Triggered when vendor completes registration', '{"type": "roles", "roles": ["admin", "procurement_officer"], "additional_recipients": []}', true),
('vendor_approved', 'Vendor Registration Approved', 'vendors', 'Triggered when vendor registration is approved', '{"type": "vendor_user", "additional_recipients": []}', true),
('vendor_rejected', 'Vendor Registration Rejected', 'vendors', 'Triggered when vendor registration is rejected', '{"type": "vendor_user", "additional_recipients": []}', true),

-- Procurement Request Events
('pr_submitted', 'Procurement Request Submitted', 'procurement', 'Triggered when a procurement request is submitted', '{"type": "roles", "roles": ["admin", "procurement_officer"], "additional_recipients": []}', true),
('pr_approved', 'Procurement Request Approved', 'procurement', 'Triggered when a procurement request is approved', '{"type": "requester", "additional_recipients": []}', true),
('pr_rejected', 'Procurement Request Rejected', 'procurement', 'Triggered when a procurement request is rejected', '{"type": "requester", "additional_recipients": []}', true),

-- Inventory Events
('inventory_low_stock', 'Low Stock Alert', 'inventory', 'Triggered when product stock falls below minimum level', '{"type": "roles", "roles": ["admin", "inventory_manager"], "additional_recipients": []}', true),
('inventory_check_out_approved', 'Check-out Request Approved', 'inventory', 'Triggered when inventory check-out is approved', '{"type": "requester", "additional_recipients": []}', true);

-- Create indexes
CREATE INDEX idx_notification_events_event_key ON public.notification_events(event_key);
CREATE INDEX idx_notification_events_category ON public.notification_events(event_category);
CREATE INDEX idx_notification_events_template_id ON public.notification_events(template_id);
CREATE INDEX idx_notification_events_active ON public.notification_events(is_active) WHERE is_active = true;