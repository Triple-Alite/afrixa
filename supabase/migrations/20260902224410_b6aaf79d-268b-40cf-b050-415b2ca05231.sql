-- 1. Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'general',
  title text NOT NULL DEFAULT '',
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

-- 2. Profiles: discovery
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discoverable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS hourly_rate numeric;

CREATE POLICY "Authenticated view discoverable talent" ON public.profiles
  FOR SELECT TO authenticated
  USING (role = 'talent'::app_user_role AND onboarding_complete = true AND discoverable = true);

CREATE POLICY "Authenticated view discoverable talent portfolio" ON public.portfolio_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = portfolio_items.user_id
      AND p.role = 'talent'::app_user_role
      AND p.onboarding_complete = true
      AND p.discoverable = true
  ));

-- 3. Hiring flow
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS escrow_id uuid REFERENCES public.escrows(id) ON DELETE SET NULL;

CREATE POLICY "Owning client updates proposals" ON public.proposals
  FOR UPDATE TO authenticated
  USING (auth.uid() = (SELECT o.client_id FROM public.opportunities o WHERE o.id = proposals.opportunity_id))
  WITH CHECK (auth.uid() = (SELECT o.client_id FROM public.opportunities o WHERE o.id = proposals.opportunity_id));

ALTER TABLE public.escrows
  ADD COLUMN IF NOT EXISTS proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS note text;

-- 4. Notification triggers
CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recipient uuid;
BEGIN
  SELECT CASE WHEN c.participant_a = NEW.sender_id THEN c.participant_b ELSE c.participant_a END
  INTO recipient FROM public.conversations c WHERE c.id = NEW.conversation_id;
  IF recipient IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (recipient, 'message', 'New message', left(NEW.body, 140), '/messages/' || NEW.conversation_id);
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.notify_on_message() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER messages_notify AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();

CREATE OR REPLACE FUNCTION public.notify_on_proposal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; opp_title text;
BEGIN
  SELECT o.client_id, o.title INTO owner_id, opp_title FROM public.opportunities o WHERE o.id = NEW.opportunity_id;
  IF owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (owner_id, 'proposal', 'New proposal received', opp_title, '/jobs/' || NEW.opportunity_id);
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.notify_on_proposal() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER proposals_notify AFTER INSERT ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.notify_on_proposal();
