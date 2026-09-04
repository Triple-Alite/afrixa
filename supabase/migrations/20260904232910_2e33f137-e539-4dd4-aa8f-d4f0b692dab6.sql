CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  tagline text,
  about text,
  industry text,
  location text,
  website text,
  company_size text,
  logo_url text,
  cover_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view companies"
  ON public.companies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create their own company"
  ON public.companies FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their company"
  ON public.companies FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their company"
  ON public.companies FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE INDEX companies_owner_id_idx ON public.companies (owner_id);
CREATE INDEX companies_industry_idx ON public.companies (industry);

CREATE TRIGGER set_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS opportunities_company_id_idx ON public.opportunities (company_id);