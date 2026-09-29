CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_org boolean := (NEW.raw_user_meta_data->>'account_type') = 'organization';
BEGIN
  INSERT INTO public.profiles (id, full_name, country, role, business_name, client_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'country',
    CASE WHEN is_org THEN 'client' ELSE NULL END,
    CASE WHEN is_org THEN NULLIF(NEW.raw_user_meta_data->>'business_name', '') ELSE NULL END,
    CASE WHEN is_org THEN 'Organization' ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;

CREATE TABLE public.identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id_type text NOT NULL CHECK (id_type IN ('nin','passport','drivers_license','voters_card','cac')),
  id_number_last4 text NOT NULL,
  full_name text NOT NULL,
  document_path text NOT NULL,
  selfie_path text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT, INSERT ON public.identity_verifications TO authenticated;
GRANT ALL ON public.identity_verifications TO service_role;
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own verifications readable" ON public.identity_verifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Submit own verification" ON public.identity_verifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending' AND review_note IS NULL AND reviewed_at IS NULL);
CREATE INDEX identity_verifications_user_idx ON public.identity_verifications(user_id, created_at DESC);

CREATE POLICY "Own verification files upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'verifications' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Own verification files read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'verifications' AND (storage.foldername(name))[1] = auth.uid()::text);