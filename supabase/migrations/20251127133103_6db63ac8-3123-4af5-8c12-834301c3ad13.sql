-- Add indexes to optimize budget allocation queries

-- Index for status filtering (used in BudgetReview)
CREATE INDEX IF NOT EXISTS idx_budget_allocations_status 
ON budget_allocations(status);

-- Index for submitted_at ordering (used in BudgetReview)
CREATE INDEX IF NOT EXISTS idx_budget_allocations_submitted_at 
ON budget_allocations(submitted_at DESC);

-- Index for submitted_by filtering (used in BudgetSubmissions for non-admin users)
CREATE INDEX IF NOT EXISTS idx_budget_allocations_submitted_by 
ON budget_allocations(submitted_by);

-- Index for created_at ordering (used in BudgetSubmissions)
CREATE INDEX IF NOT EXISTS idx_budget_allocations_created_at 
ON budget_allocations(created_at DESC);

-- Composite index for common query pattern (status + submitted_at)
CREATE INDEX IF NOT EXISTS idx_budget_allocations_status_submitted_at 
ON budget_allocations(status, submitted_at DESC);

-- Index for allocation_id on budget_line_items (for faster joins)
CREATE INDEX IF NOT EXISTS idx_budget_line_items_allocation_id 
ON budget_line_items(allocation_id);