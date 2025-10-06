-- Update the CHECK constraint on rfps.status to include 'closed'
-- First, drop the existing constraint
ALTER TABLE public.rfps DROP CONSTRAINT IF EXISTS rfps_status_check;

-- Add the updated constraint with 'closed' status
ALTER TABLE public.rfps ADD CONSTRAINT rfps_status_check 
CHECK (status IN ('draft', 'published', 'evaluation', 'awarded', 'canceled', 'closed', 'expired'));