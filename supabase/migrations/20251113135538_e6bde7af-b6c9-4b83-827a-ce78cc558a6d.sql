-- Fix 1: Restrict profiles table access
-- Remove overly permissive policy and replace with secure policies
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;

-- Users can view their own profile, admins can view all profiles
CREATE POLICY "Users view own profile and admins view all"
ON profiles FOR SELECT
USING (
  auth.uid() = id 
  OR has_role(auth.uid(), 'admin'::user_role)
  OR has_role(auth.uid(), 'procurement_officer'::user_role)
);

-- Fix 2: Add RLS policies for approval_hierarchies table
-- Admins can manage approval hierarchies
CREATE POLICY "Admins manage approval hierarchies"
ON approval_hierarchies FOR ALL
USING (
  has_role(auth.uid(), 'admin'::user_role) 
  OR has_role(auth.uid(), 'procurement_officer'::user_role)
);

-- All authenticated users can view approval hierarchies (needed for approval workflows)
CREATE POLICY "Authenticated users can view approval hierarchies"
ON approval_hierarchies FOR SELECT
USING (auth.role() = 'authenticated');