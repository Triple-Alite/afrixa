CREATE TYPE public.app_user_role AS ENUM ('talent','client');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  role public.app_user_role,
  full_name TEXT NOT NULL DEFAULT '',
  business_name TEXT,
  country TEXT,
  avatar_url TEXT,
  headline TEXT,
  bio TEXT,
  primary_skill TEXT,
  years_experience TEXT,
  languages TEXT[] NOT NULL DEFAULT '{}',
  client_type TEXT,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  profile_strength INT NOT NULL DEFAULT 20,
  verified BOOLEAN NOT NULL DEFAULT false,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users delete own profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  country TEXT,
  category TEXT NOT NULL DEFAULT 'job',
  job_type TEXT,
  work_mode TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  budget_min NUMERIC,
  budget_max NUMERIC,
  price_from NUMERIC,
  escrow_funded BOOLEAN NOT NULL DEFAULT false,
  rating NUMERIC,
  reviews_count INT NOT NULL DEFAULT 0,
  delivery_days INT,
  deadline DATE,
  experience_level TEXT,
  description TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT SELECT ON public.opportunities TO anon;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Opportunities are public" ON public.opportunities FOR SELECT USING (true);
CREATE POLICY "Clients insert own opportunities" ON public.opportunities FOR INSERT TO authenticated WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Clients update own opportunities" ON public.opportunities FOR UPDATE TO authenticated USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Clients delete own opportunities" ON public.opportunities FOR DELETE TO authenticated USING (auth.uid() = client_id);

CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities ON DELETE CASCADE,
  talent_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  cover_letter TEXT NOT NULL DEFAULT '',
  bid_amount NUMERIC,
  currency TEXT NOT NULL DEFAULT 'USD',
  delivery_days INT,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, talent_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Talent and owning client read proposals" ON public.proposals FOR SELECT TO authenticated
  USING (auth.uid() = talent_id OR auth.uid() = (SELECT client_id FROM public.opportunities o WHERE o.id = opportunity_id));
CREATE POLICY "Talent insert own proposals" ON public.proposals FOR INSERT TO authenticated WITH CHECK (auth.uid() = talent_id);
CREATE POLICY "Talent update own proposals" ON public.proposals FOR UPDATE TO authenticated USING (auth.uid() = talent_id) WITH CHECK (auth.uid() = talent_id);
CREATE POLICY "Talent delete own proposals" ON public.proposals FOR DELETE TO authenticated USING (auth.uid() = talent_id);

CREATE TABLE public.portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  link_url TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_items TO authenticated;
GRANT SELECT ON public.portfolio_items TO anon;
GRANT ALL ON public.portfolio_items TO service_role;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Portfolio is public" ON public.portfolio_items FOR SELECT USING (true);
CREATE POLICY "Users manage own portfolio" ON public.portfolio_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  skill TEXT NOT NULL,
  score INT NOT NULL DEFAULT 0,
  level TEXT NOT NULL DEFAULT 'Beginner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT SELECT ON public.assessments TO anon;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Assessments are public" ON public.assessments FOR SELECT USING (true);
CREATE POLICY "Users manage own assessments" ON public.assessments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.payout_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  country TEXT,
  method TEXT NOT NULL DEFAULT 'bank_transfer',
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payout_methods TO authenticated;
GRANT ALL ON public.payout_methods TO service_role;
ALTER TABLE public.payout_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own payout methods" ON public.payout_methods FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  participant_b UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  subject TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read conversations" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() IN (participant_a, participant_b));
CREATE POLICY "Participants create conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() IN (participant_a, participant_b));
CREATE POLICY "Participants update conversations" ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() IN (participant_a, participant_b)) WITH CHECK (auth.uid() IN (participant_a, participant_b));

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read messages" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.participant_a, c.participant_b)));
CREATE POLICY "Participants send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.participant_a, c.participant_b)));
CREATE POLICY "Senders update own messages" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);

CREATE TABLE public.escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES public.opportunities ON DELETE SET NULL,
  client_id UUID REFERENCES auth.users ON DELETE SET NULL,
  talent_id UUID REFERENCES auth.users ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  company TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  local_amount NUMERIC,
  local_currency TEXT,
  status TEXT NOT NULL DEFAULT 'funded',
  funded_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.escrows TO authenticated;
GRANT ALL ON public.escrows TO service_role;
ALTER TABLE public.escrows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties read escrows" ON public.escrows FOR SELECT TO authenticated USING (auth.uid() IN (client_id, talent_id));
CREATE POLICY "Parties create escrows" ON public.escrows FOR INSERT TO authenticated WITH CHECK (auth.uid() IN (client_id, talent_id));
CREATE POLICY "Parties update escrows" ON public.escrows FOR UPDATE TO authenticated USING (auth.uid() IN (client_id, talent_id)) WITH CHECK (auth.uid() IN (client_id, talent_id));

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'credit',
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own transactions" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, country)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.raw_user_meta_data->>'country')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

INSERT INTO public.opportunities (title, company, country, category, job_type, work_mode, currency, budget_min, budget_max, escrow_funded, deadline, experience_level, description, skills) VALUES
('UI/UX Designer for FinTech Mobile App','GlobePay Ltd','United Kingdom','job','Full Time','Remote','USD',1200,1500,true,now()::date + 15,'3+ Years','We are looking for a talented UI/UX Designer to design our fintech mobile app from onboarding to payments. You will work closely with our product team to ship a delightful, accessible experience.','{"UI/UX Design","Mobile Design","User Research"}'),
('Frontend Developer','TechNove Inc.','Nigeria','job','Full Time','Remote','USD',1200,1800,true,now()::date + 10,'2+ Years','Build and maintain modern web interfaces for our logistics platform.','{"React","JavaScript","TypeScript"}'),
('Content Writer','BrightPen Media','Kenya','job','Contract','Remote','USD',400,700,false,now()::date + 7,'1+ Years','Write long-form articles and newsletters for an African business audience.','{"Writing","SEO","Editing"}'),
('Virtual Assistant','Global Support','Ghana','job','Part Time','Remote','USD',300,400,false,now()::date + 5,'1+ Years','Manage inbox, calendar and travel scheduling for a small international team.','{"Management","Email","Calendar"}'),
('Website UI/UX Design','Ecommerce Africa','Nigeria','freelance','Contract','Remote','NGN',150000,250000,true,now()::date + 2,'3+ Years','Redesign our storefront and checkout for mobile-first shoppers.','{"Figma","UI/UX","Web Design"}'),
('Mobile App Designer','HealthConnect','Kenya','freelance','Contract','Remote','USD',800,1200,false,now()::date + 5,'2+ Years','Design a patient booking flow for a telehealth app.','{"Mobile Design","Prototyping"}'),
('Dashboard UI Design','DataMain Ltd.','Egypt','freelance','Contract','Remote','NGN',150000,250000,false,now()::date + 3,'3+ Years','Design an analytics dashboard for a logistics data product.','{"Dashboards","Data Viz","Figma"}'),
('Product Design Intern','Afrilearn','Nigeria','internship','Internship','Hybrid','NGN',80000,120000,false,now()::date + 20,'Entry','Support the design team on research, wireframes and design QA.','{"Figma","Research"}'),
('Creative Africa Innovation Grant','Afrixa Foundation','Pan-African','grant','Grant','Remote','USD',5000,10000,false,now()::date + 40,'Any','Funding for African creators building tools for local communities.','{"Grant","Innovation"}');

INSERT INTO public.opportunities (title, company, country, category, currency, price_from, rating, reviews_count, delivery_days, description, skills) VALUES
('Design a modern website landing page in Figma','Adaeze O.','Nigeria','gig','USD',100,4.9,72,2,'A conversion-focused landing page designed in Figma, fully responsive.','{"Figma","Landing Page","Web Design"}'),
('Write SEO blog post 1000 words','Kwesi B.','Ghana','gig','USD',50,4.8,54,2,'Well-researched, keyword-optimised blog post with headings and meta.','{"SEO","Writing"}'),
('Edit and color grade 10 min video','Miriam T.','Kenya','gig','USD',80,4.9,38,3,'Professional edit, color grade, sound clean-up and captions.','{"Video Editing","Color Grading"}'),
('Create social media graphics pack','Segun A.','Nigeria','gig','USD',60,4.8,41,2,'Ten on-brand graphics sized for Instagram, X and LinkedIn.','{"Graphic Design","Social Media"}'),
('Brand Identity Design','Studio Kano','Nigeria','freelance','USD',400,4.9,20,5,'Logo, colour system, typography and a compact brand guide.','{"Branding","Logo Design"}'),
('SEO Content Writing','WordCraft Africa','Kenya','freelance','USD',200,4.8,20,3,'Monthly SEO content package with keyword research.','{"SEO","Writing","Marketing"}'),
('Mobile App Development','Kigali Devs','Rwanda','freelance','USD',1500,4.9,18,10,'Cross-platform mobile app build with clean handover.','{"React Native","Development"}'),
('Social Media Management','Lagos Social','Nigeria','freelance','USD',300,4.7,21,7,'Content calendar, scheduling and community management.','{"Marketing","Social Media"}');