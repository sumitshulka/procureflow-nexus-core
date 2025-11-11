-- Add foreign key relationship between po_approval_matrix and profiles
ALTER TABLE po_approval_matrix
ADD CONSTRAINT po_approval_matrix_approver_user_id_fkey
FOREIGN KEY (approver_user_id) REFERENCES profiles(id) ON DELETE SET NULL;