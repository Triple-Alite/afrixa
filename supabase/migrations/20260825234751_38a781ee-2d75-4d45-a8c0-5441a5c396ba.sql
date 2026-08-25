DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
REVOKE SELECT ON public.profiles FROM anon;

DROP POLICY IF EXISTS "Portfolio is public" ON public.portfolio_items;
CREATE POLICY "Users view own portfolio" ON public.portfolio_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE SELECT ON public.portfolio_items FROM anon;

DROP POLICY IF EXISTS "Assessments are public" ON public.assessments;
CREATE POLICY "Users view own assessments" ON public.assessments FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE SELECT ON public.assessments FROM anon;