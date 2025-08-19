-- Secure profiles: restrict to authenticated-only reads
BEGIN;

-- Ensure RLS is enabled (no-op if already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop overly permissive policy allowing public reads, if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' 
      AND policyname = 'Users can view any profile'
  ) THEN
    DROP POLICY "Users can view any profile" ON public.profiles;
  END IF;
END$$;

-- Create authenticated-only SELECT policy if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' 
      AND policyname = 'Authenticated users can view profiles'
  ) THEN
    CREATE POLICY "Authenticated users can view profiles"
    ON public.profiles
    FOR SELECT
    USING (auth.role() = 'authenticated');
  END IF;
END$$;

COMMIT;