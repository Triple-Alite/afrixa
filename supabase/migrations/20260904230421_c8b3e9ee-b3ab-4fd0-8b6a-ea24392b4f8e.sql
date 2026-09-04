CREATE POLICY "Authenticated view connected profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.are_connected(auth.uid(), id));

CREATE POLICY "Authenticated view public post authors" ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.author_id = profiles.id AND p.visibility = 'public'
  ));