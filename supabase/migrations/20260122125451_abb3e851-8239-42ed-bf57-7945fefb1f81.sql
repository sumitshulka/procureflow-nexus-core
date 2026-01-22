-- Create user_department_assignments table for many-to-many relationship with audit history
CREATE TABLE public.user_department_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    assigned_by UUID REFERENCES auth.users(id),
    removed_at TIMESTAMP WITH TIME ZONE,
    removed_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, department_id, assigned_at)
);

-- Create index for faster lookups
CREATE INDEX idx_user_dept_assignments_user ON public.user_department_assignments(user_id) WHERE is_active = true;
CREATE INDEX idx_user_dept_assignments_dept ON public.user_department_assignments(department_id) WHERE is_active = true;
CREATE INDEX idx_user_dept_assignments_audit ON public.user_department_assignments(user_id, assigned_at, removed_at);

-- Enable RLS
ALTER TABLE public.user_department_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can do everything
CREATE POLICY "Admins can manage department assignments"
ON public.user_department_assignments
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.custom_roles cr ON ur.role_id = cr.id
        WHERE ur.user_id = auth.uid()
        AND LOWER(cr.name) = 'admin'
    )
);

-- Users can view their own assignments
CREATE POLICY "Users can view own assignments"
ON public.user_department_assignments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Department heads can view assignments in their departments
CREATE POLICY "Department heads can view department assignments"
ON public.user_department_assignments
FOR SELECT
TO authenticated
USING (
    department_id IN (
        SELECT department_id FROM public.user_department_assignments
        WHERE user_id = auth.uid() AND is_active = true
    )
);

-- Create trigger to update updated_at
CREATE TRIGGER update_user_dept_assignments_updated_at
BEFORE UPDATE ON public.user_department_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a view for active department assignments (easier querying)
CREATE VIEW public.active_user_departments AS
SELECT 
    uda.id,
    uda.user_id,
    uda.department_id,
    d.name as department_name,
    uda.assigned_at,
    uda.assigned_by,
    p.full_name as assigned_by_name
FROM public.user_department_assignments uda
JOIN public.departments d ON d.id = uda.department_id
LEFT JOIN public.profiles p ON p.id = uda.assigned_by
WHERE uda.is_active = true;

-- Create a view for department assignment history (for auditors)
CREATE VIEW public.user_department_history AS
SELECT 
    uda.id,
    uda.user_id,
    up.full_name as user_name,
    uda.department_id,
    d.name as department_name,
    uda.assigned_at,
    uda.assigned_by,
    ap.full_name as assigned_by_name,
    uda.removed_at,
    uda.removed_by,
    rp.full_name as removed_by_name,
    uda.is_active,
    uda.notes
FROM public.user_department_assignments uda
JOIN public.departments d ON d.id = uda.department_id
LEFT JOIN public.profiles up ON up.id = uda.user_id
LEFT JOIN public.profiles ap ON ap.id = uda.assigned_by
LEFT JOIN public.profiles rp ON rp.id = uda.removed_by
ORDER BY uda.user_id, uda.assigned_at DESC;

-- Function to assign user to department with audit trail
CREATE OR REPLACE FUNCTION public.assign_user_to_department(
    p_user_id UUID,
    p_department_id UUID,
    p_assigned_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_assignment_id UUID;
BEGIN
    -- Check if already actively assigned
    IF EXISTS (
        SELECT 1 FROM user_department_assignments 
        WHERE user_id = p_user_id 
        AND department_id = p_department_id 
        AND is_active = true
    ) THEN
        -- Return existing assignment id
        SELECT id INTO v_assignment_id 
        FROM user_department_assignments 
        WHERE user_id = p_user_id 
        AND department_id = p_department_id 
        AND is_active = true;
        RETURN v_assignment_id;
    END IF;
    
    -- Create new assignment
    INSERT INTO user_department_assignments (user_id, department_id, assigned_by, notes)
    VALUES (p_user_id, p_department_id, p_assigned_by, p_notes)
    RETURNING id INTO v_assignment_id;
    
    RETURN v_assignment_id;
END;
$$;

-- Function to remove user from department with audit trail
CREATE OR REPLACE FUNCTION public.remove_user_from_department(
    p_user_id UUID,
    p_department_id UUID,
    p_removed_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE user_department_assignments
    SET 
        is_active = false,
        removed_at = now(),
        removed_by = p_removed_by,
        notes = COALESCE(p_notes, notes)
    WHERE user_id = p_user_id 
    AND department_id = p_department_id 
    AND is_active = true;
    
    RETURN FOUND;
END;
$$;

-- Function to get user's active departments
CREATE OR REPLACE FUNCTION public.get_user_departments(p_user_id UUID)
RETURNS TABLE (
    department_id UUID,
    department_name TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        uda.department_id,
        d.name as department_name,
        uda.assigned_at
    FROM user_department_assignments uda
    JOIN departments d ON d.id = uda.department_id
    WHERE uda.user_id = p_user_id 
    AND uda.is_active = true
    ORDER BY d.name;
$$;