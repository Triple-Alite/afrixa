CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE is_org boolean := (NEW.raw_user_meta_data->>'account_type') = 'organization';
BEGIN
  INSERT INTO public.profiles (id, full_name, country, role, business_name, client_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'country',
    CASE WHEN is_org THEN 'client'::public.app_user_role ELSE NULL::public.app_user_role END,
    CASE WHEN is_org THEN NULLIF(NEW.raw_user_meta_data->>'business_name', '') ELSE NULL END,
    CASE WHEN is_org THEN 'Organization' ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $function$;