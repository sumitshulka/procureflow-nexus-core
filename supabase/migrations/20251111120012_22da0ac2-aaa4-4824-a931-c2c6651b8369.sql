-- Add department_id column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id) ON DELETE SET NULL;