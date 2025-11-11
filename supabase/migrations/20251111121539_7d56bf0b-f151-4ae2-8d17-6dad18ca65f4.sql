-- Add is_vendor flag to profiles to distinguish vendor users from system users
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_vendor boolean NOT NULL DEFAULT false;

-- Mark existing vendor users
UPDATE profiles 
SET is_vendor = true 
WHERE id IN (SELECT user_id FROM vendor_registrations);

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_vendor ON profiles(is_vendor);