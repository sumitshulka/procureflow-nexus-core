-- Add revision_requested status to the budget_allocation_status enum
ALTER TYPE budget_allocation_status ADD VALUE IF NOT EXISTS 'revision_requested' AFTER 'under_review';