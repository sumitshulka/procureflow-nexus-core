-- Fix views to use security_invoker instead of security_definer
DROP VIEW IF EXISTS public.active_user_departments;
DROP VIEW IF EXISTS public.user_department_history;

-- Recreate views with security_invoker
CREATE VIEW public.active_user_departments
WITH (security_invoker = on) AS
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

CREATE VIEW public.user_department_history
WITH (security_invoker = on) AS
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