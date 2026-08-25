-- 1. Escrows: read-only for regular users; only trusted server-side (service_role) can write.
DROP POLICY IF EXISTS "Parties create escrows" ON public.escrows;
DROP POLICY IF EXISTS "Parties update escrows" ON public.escrows;
REVOKE INSERT, UPDATE, DELETE ON public.escrows FROM authenticated;
GRANT ALL ON public.escrows TO service_role;

-- 2. Profiles: block users from writing trust signals (verified, total_earned).
CREATE OR REPLACE FUNCTION public.protect_profile_trust_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    NEW.verified := OLD.verified;
    NEW.total_earned := OLD.total_earned;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_trust_fields ON public.profiles;
CREATE TRIGGER profiles_protect_trust_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_trust_fields();