-- Create RFP Addendums table
CREATE TABLE public.rfp_addendums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfp_id UUID NOT NULL REFERENCES public.rfps(id) ON DELETE CASCADE,
  addendum_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_published BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(rfp_id, addendum_number)
);

-- Create RFP Communications table for Q&A and clarifications
CREATE TABLE public.rfp_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfp_id UUID NOT NULL REFERENCES public.rfps(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.rfp_communications(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('vendor', 'organization')),
  sender_id UUID NOT NULL,
  recipient_type TEXT CHECK (recipient_type IN ('vendor', 'organization', 'all_vendors')),
  recipient_id UUID,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_clarification BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'read', 'replied')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create RFP Notifications table
CREATE TABLE public.rfp_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfp_id UUID NOT NULL REFERENCES public.rfps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('addendum', 'clarification', 'communication', 'deadline_reminder')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_entity_type TEXT CHECK (related_entity_type IN ('addendum', 'communication')),
  related_entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rfp_addendums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfp_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfp_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for RFP Addendums
CREATE POLICY "Organization can manage addendums" 
ON public.rfp_addendums 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.rfps r 
    WHERE r.id = rfp_addendums.rfp_id 
    AND r.created_by = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::user_role) 
  OR has_role(auth.uid(), 'procurement_officer'::user_role)
);

CREATE POLICY "Vendors can view published addendums" 
ON public.rfp_addendums 
FOR SELECT 
USING (is_published = true);

-- RLS Policies for RFP Communications
CREATE POLICY "Organization can manage all communications" 
ON public.rfp_communications 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.rfps r 
    WHERE r.id = rfp_communications.rfp_id 
    AND r.created_by = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::user_role) 
  OR has_role(auth.uid(), 'procurement_officer'::user_role)
);

CREATE POLICY "Vendors can view and create relevant communications" 
ON public.rfp_communications 
FOR ALL 
USING (
  -- Vendor can see public clarifications
  (is_public = true) OR
  -- Vendor can see communications they sent
  (sender_type = 'vendor' AND sender_id = auth.uid()) OR
  -- Vendor can see communications addressed to them
  (recipient_type = 'vendor' AND recipient_id = auth.uid()) OR
  -- Vendor can see communications addressed to all vendors
  (recipient_type = 'all_vendors' AND EXISTS (
    SELECT 1 FROM public.vendor_registrations vr 
    WHERE vr.user_id = auth.uid() AND vr.status = 'approved'
  ))
);

-- RLS Policies for RFP Notifications
CREATE POLICY "Users can view their own notifications" 
ON public.rfp_notifications 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" 
ON public.rfp_notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" 
ON public.rfp_notifications 
FOR UPDATE 
USING (user_id = auth.uid());

-- Create function to generate addendum number
CREATE OR REPLACE FUNCTION public.generate_addendum_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Get the next addendum number for this RFP
    SELECT COALESCE(MAX(addendum_number), 0) + 1 
    INTO next_number
    FROM public.rfp_addendums 
    WHERE rfp_id = NEW.rfp_id;
    
    NEW.addendum_number := next_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for addendum number generation
CREATE TRIGGER generate_addendum_number_trigger
    BEFORE INSERT ON public.rfp_addendums
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_addendum_number();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_rfp_communication_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_rfp_addendums_updated_at
    BEFORE UPDATE ON public.rfp_addendums
    FOR EACH ROW
    EXECUTE FUNCTION public.update_rfp_communication_updated_at();

CREATE TRIGGER update_rfp_communications_updated_at
    BEFORE UPDATE ON public.rfp_communications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_rfp_communication_updated_at();