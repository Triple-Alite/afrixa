-- Skills
CREATE TABLE public.profile_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'intermediate',
  years NUMERIC,
  position INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE public.work_experiences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  employment_type TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.education_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school TEXT NOT NULL,
  qualification TEXT,
  field_of_study TEXT,
  start_year INTEGER,
  end_year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuer TEXT NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  credential_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_skills TO authenticated;
GRANT ALL ON public.profile_skills TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_experiences TO authenticated;
GRANT ALL ON public.work_experiences TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.education_entries TO authenticated;
GRANT ALL ON public.education_entries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certifications TO authenticated;
GRANT ALL ON public.certifications TO service_role;

ALTER TABLE public.profile_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

-- profile_skills
CREATE POLICY "Users manage own skills" ON public.profile_skills
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members view visible skills" ON public.profile_skills
  FOR SELECT TO authenticated USING (
    auth.uid() = user_id
    OR public.are_connected(auth.uid(), user_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_skills.user_id
        AND p.role = 'talent'::app_user_role
        AND p.onboarding_complete = true
        AND p.discoverable = true
    )
  );

-- work_experiences
CREATE POLICY "Users manage own experience" ON public.work_experiences
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members view visible experience" ON public.work_experiences
  FOR SELECT TO authenticated USING (
    auth.uid() = user_id
    OR public.are_connected(auth.uid(), user_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = work_experiences.user_id
        AND p.role = 'talent'::app_user_role
        AND p.onboarding_complete = true
        AND p.discoverable = true
    )
  );

-- education_entries
CREATE POLICY "Users manage own education" ON public.education_entries
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members view visible education" ON public.education_entries
  FOR SELECT TO authenticated USING (
    auth.uid() = user_id
    OR public.are_connected(auth.uid(), user_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = education_entries.user_id
        AND p.role = 'talent'::app_user_role
        AND p.onboarding_complete = true
        AND p.discoverable = true
    )
  );

-- certifications
CREATE POLICY "Users manage own certifications" ON public.certifications
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members view visible certifications" ON public.certifications
  FOR SELECT TO authenticated USING (
    auth.uid() = user_id
    OR public.are_connected(auth.uid(), user_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = certifications.user_id
        AND p.role = 'talent'::app_user_role
        AND p.onboarding_complete = true
        AND p.discoverable = true
    )
  );

CREATE INDEX idx_profile_skills_user ON public.profile_skills(user_id);
CREATE INDEX idx_work_experiences_user ON public.work_experiences(user_id, start_date DESC);
CREATE INDEX idx_education_user ON public.education_entries(user_id, end_year DESC);
CREATE INDEX idx_certifications_user ON public.certifications(user_id, issue_date DESC);

CREATE TRIGGER profile_skills_set_updated_at BEFORE UPDATE ON public.profile_skills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER work_experiences_set_updated_at BEFORE UPDATE ON public.work_experiences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER education_entries_set_updated_at BEFORE UPDATE ON public.education_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER certifications_set_updated_at BEFORE UPDATE ON public.certifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();