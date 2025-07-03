-- First, let's check if we need to create an approval workflow for vendor registrations
-- and fix the RLS policies for user_roles table

-- Allow users to create vendor role for themselves during registration
CREATE POLICY "Allow vendor role creation during registration" 
ON user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'vendor');

-- Create approval workflow for vendor registrations
-- This will create an approval request when vendor registration is created
CREATE OR REPLACE FUNCTION create_vendor_approval_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert approval request for vendor registration
  INSERT INTO approvals (
    entity_type,
    entity_id,
    requester_id,
    status,
    comments
  ) VALUES (
    'vendor_registration',
    NEW.id,
    NEW.user_id,
    'pending',
    'New vendor registration submitted for approval'
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create approval requests for vendor registrations
CREATE TRIGGER vendor_registration_approval_trigger
  AFTER INSERT ON vendor_registrations
  FOR EACH ROW
  EXECUTE FUNCTION create_vendor_approval_request();