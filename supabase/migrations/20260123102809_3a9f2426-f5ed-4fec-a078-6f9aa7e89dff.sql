-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their department allocations" ON budget_allocations;
DROP POLICY IF EXISTS "Admins can manage all allocations" ON budget_allocations;

-- Create SELECT policy using custom_roles table
CREATE POLICY "Users can view their department allocations"
ON budget_allocations
FOR SELECT
USING (
  -- Check if user is admin via custom_roles table
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN custom_roles cr ON ur.role_id = cr.id
    WHERE ur.user_id = auth.uid() 
    AND cr.name ILIKE '%admin%'
  )
  OR
  -- User's department allocations
  department_id IN (
    SELECT department_id FROM user_department_assignments
    WHERE user_id = auth.uid() AND is_active = true
  )
  OR
  -- Allocations user submitted
  submitted_by = auth.uid()
);

-- Create ALL policy for admins using custom_roles table
CREATE POLICY "Admins can manage all allocations"
ON budget_allocations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN custom_roles cr ON ur.role_id = cr.id
    WHERE ur.user_id = auth.uid() 
    AND cr.name ILIKE '%admin%'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN custom_roles cr ON ur.role_id = cr.id
    WHERE ur.user_id = auth.uid() 
    AND cr.name ILIKE '%admin%'
  )
);