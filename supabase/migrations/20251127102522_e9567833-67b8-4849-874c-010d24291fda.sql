-- Add inventory valuation method to organization settings
ALTER TABLE organization_settings
ADD COLUMN inventory_valuation_method TEXT NOT NULL DEFAULT 'weighted_average'
CHECK (inventory_valuation_method IN ('fifo', 'lifo', 'weighted_average'));

COMMENT ON COLUMN organization_settings.inventory_valuation_method IS 'Method used for inventory valuation: fifo (First In First Out), lifo (Last In First Out), or weighted_average';