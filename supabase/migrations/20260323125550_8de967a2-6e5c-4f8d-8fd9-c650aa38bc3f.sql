-- Create table to store SKU attribute definitions per category
CREATE TABLE public.category_sku_attributes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    attribute_name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(category_id, attribute_name)
);

-- Enable RLS
ALTER TABLE public.category_sku_attributes ENABLE ROW LEVEL SECURITY;

-- Policies - authenticated users can read, admins can manage
CREATE POLICY "Authenticated users can view category SKU attributes"
    ON public.category_sku_attributes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can insert category SKU attributes"
    ON public.category_sku_attributes FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update category SKU attributes"
    ON public.category_sku_attributes FOR UPDATE
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins can delete category SKU attributes"
    ON public.category_sku_attributes FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- Index for fast lookups
CREATE INDEX idx_category_sku_attributes_category ON public.category_sku_attributes(category_id);