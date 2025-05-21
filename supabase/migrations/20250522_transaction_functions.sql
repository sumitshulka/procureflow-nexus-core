
-- Create functions to support transactions for deletion
CREATE OR REPLACE FUNCTION public.begin_transaction()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  BEGIN;
  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.commit_transaction()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  COMMIT;
  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.rollback_transaction()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  ROLLBACK;
  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
