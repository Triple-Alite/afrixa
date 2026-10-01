ALTER TABLE public.messages ADD COLUMN reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  emoji text NOT NULL CHECK (char_length(emoji) <= 16),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX message_reactions_message_idx ON public.message_reactions(message_id);

CREATE OR REPLACE FUNCTION public.can_access_message(_message_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.messages m JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = _message_id AND auth.uid() IN (c.participant_a, c.participant_b)
  );
$$;

CREATE POLICY "Participants view reactions" ON public.message_reactions FOR SELECT TO authenticated
  USING (public.can_access_message(message_id));
CREATE POLICY "Participants add own reaction" ON public.message_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_access_message(message_id));
CREATE POLICY "Users update own reaction" ON public.message_reactions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own reaction" ON public.message_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;