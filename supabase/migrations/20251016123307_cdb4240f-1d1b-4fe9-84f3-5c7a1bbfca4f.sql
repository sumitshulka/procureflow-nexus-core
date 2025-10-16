-- Add 'department_head' to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'department_head';

-- Add head_of_department_id column to departments table
ALTER TABLE public.departments
ADD COLUMN IF NOT EXISTS head_of_department_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_departments_head ON public.departments(head_of_department_id);

-- Create a function to log department head assignment changes
CREATE OR REPLACE FUNCTION public.log_department_head_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_head_name text;
  new_head_name text;
BEGIN
  -- Get names for logging
  IF OLD.head_of_department_id IS NOT NULL THEN
    SELECT full_name INTO old_head_name FROM profiles WHERE id = OLD.head_of_department_id;
  END IF;
  
  IF NEW.head_of_department_id IS NOT NULL THEN
    SELECT full_name INTO new_head_name FROM profiles WHERE id = NEW.head_of_department_id;
  END IF;
  
  -- Log the change
  INSERT INTO public.activity_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    auth.uid(),
    CASE 
      WHEN OLD.head_of_department_id IS NULL AND NEW.head_of_department_id IS NOT NULL THEN 'department_head_assigned'
      WHEN OLD.head_of_department_id IS NOT NULL AND NEW.head_of_department_id IS NULL THEN 'department_head_removed'
      WHEN OLD.head_of_department_id != NEW.head_of_department_id THEN 'department_head_changed'
      ELSE 'department_head_updated'
    END,
    'department',
    NEW.id,
    jsonb_build_object(
      'department_name', NEW.name,
      'old_head_id', OLD.head_of_department_id,
      'old_head_name', old_head_name,
      'new_head_id', NEW.head_of_department_id,
      'new_head_name', new_head_name,
      'timestamp', NOW()
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for department head changes
DROP TRIGGER IF EXISTS on_department_head_change ON public.departments;
CREATE TRIGGER on_department_head_change
  AFTER UPDATE OF head_of_department_id ON public.departments
  FOR EACH ROW
  WHEN (OLD.head_of_department_id IS DISTINCT FROM NEW.head_of_department_id)
  EXECUTE FUNCTION public.log_department_head_change();