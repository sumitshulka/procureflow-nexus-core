
-- Allow per-level approver configuration: either a role (optionally scoped to a department)
-- or a specific user. The existing department_id remains the REQUESTER's department.

ALTER TABLE public.approval_hierarchies
  ADD COLUMN IF NOT EXISTS approver_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS approver_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

ALTER TABLE public.approval_hierarchies
  ALTER COLUMN approver_role DROP NOT NULL;

-- Ensure exactly one of role or user is set per row
ALTER TABLE public.approval_hierarchies
  DROP CONSTRAINT IF EXISTS approval_hierarchies_approver_target_chk;
ALTER TABLE public.approval_hierarchies
  ADD CONSTRAINT approval_hierarchies_approver_target_chk
  CHECK (
    (approver_role IS NOT NULL AND approver_user_id IS NULL)
    OR (approver_role IS NULL AND approver_user_id IS NOT NULL)
  );
