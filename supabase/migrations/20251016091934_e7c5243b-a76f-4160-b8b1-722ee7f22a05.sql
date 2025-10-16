-- Add RLS policies for budget_heads table
CREATE POLICY "Admin can manage budget heads"
ON public.budget_heads
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can view budget heads"
ON public.budget_heads
FOR SELECT
USING (auth.role() = 'authenticated'::text);

-- Add RLS policies for budget_cycles table  
CREATE POLICY "Admin can manage budget cycles"
ON public.budget_cycles
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can view budget cycles"
ON public.budget_cycles
FOR SELECT
USING (auth.role() = 'authenticated'::text);