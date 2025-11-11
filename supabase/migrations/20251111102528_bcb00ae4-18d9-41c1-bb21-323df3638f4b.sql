-- Add PO number format configuration to standard_po_settings
ALTER TABLE public.standard_po_settings
ADD COLUMN IF NOT EXISTS po_number_format JSONB DEFAULT jsonb_build_object(
  'prefix', 'PO',
  'middle_section_type', 'year',
  'middle_format', 'YYYY',
  'running_number_digits', 4,
  'reset_annually', true,
  'fiscal_year_start_month', 1,
  'fiscal_year_start_year', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  'fiscal_year_end_month', 12,
  'fiscal_year_end_year', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
);

COMMENT ON COLUMN public.standard_po_settings.po_number_format IS 'Configuration for PO number format including prefix, date format, running number settings, and fiscal year';