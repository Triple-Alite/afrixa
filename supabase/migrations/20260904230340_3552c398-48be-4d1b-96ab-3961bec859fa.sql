-- profiles additions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS profile_views INTEGER NOT NULL DEFAULT 0;

-- posts
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  link_url TEXT,
  kind TEXT NOT NULL DEFAULT 'update',
  visibility TEXT NOT NULL DEFAULT 'public',
  comment_count INTEGER NOT NULL DEFAULT 0,
  reaction_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT posts_kind_check CHECK (kind IN ('update','article','job','portfolio','announcement')),
  CONSTRAINT posts_visibility_check CHECK (visibility IN ('public','connections'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.post_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id),
  CONSTRAINT post_reactions_kind_check CHECK (reaction IN ('like','celebrate','insightful','support','curious'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_reactions TO authenticated;
GRANT ALL ON public.post_reactions TO service_role;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  addressee_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id),
  CONSTRAINT connections_status_check CHECK (status IN ('pending','accepted','declined')),
  CONSTRAINT connections_distinct_check CHECK (requester_id <> addressee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connections TO authenticated;
GRANT ALL ON public.connections TO service_role;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CONSTRAINT follows_distinct_check CHECK (follower_id <> following_id)
);
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.saved_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_type TEXT NOT NULL,
  item_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_type, item_id),
  CONSTRAINT saved_items_type_check CHECK (item_type IN ('post','opportunity','talent','service','article'))
);
GRANT SELECT, INSERT, DELETE ON public.saved_items TO authenticated;
GRANT ALL ON public.saved_items TO service_role;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

-- helper: are two users connected?
CREATE OR REPLACE FUNCTION public.are_connected(_a UUID, _b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.connections
    WHERE status = 'accepted'
      AND ((requester_id = _a AND addressee_id = _b)
        OR (requester_id = _b AND addressee_id = _a))
  );
$$;
REVOKE ALL ON FUNCTION public.are_connected(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.are_connected(UUID, UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_view_post(_post_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = _post_id
      AND (p.visibility = 'public'
        OR p.author_id = auth.uid()
        OR public.are_connected(auth.uid(), p.author_id))
  );
$$;
REVOKE ALL ON FUNCTION public.can_view_post(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_post(UUID) TO authenticated, service_role;

-- posts policies
CREATE POLICY "posts_read" ON public.posts FOR SELECT TO authenticated
  USING (visibility = 'public' OR author_id = auth.uid() OR public.are_connected(auth.uid(), author_id));
CREATE POLICY "posts_insert_own" ON public.posts FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());
CREATE POLICY "posts_update_own" ON public.posts FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "posts_delete_own" ON public.posts FOR DELETE TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "post_comments_read" ON public.post_comments FOR SELECT TO authenticated
  USING (public.can_view_post(post_id));
CREATE POLICY "post_comments_insert_own" ON public.post_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.can_view_post(post_id));
CREATE POLICY "post_comments_update_own" ON public.post_comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "post_comments_delete_own" ON public.post_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "post_reactions_read" ON public.post_reactions FOR SELECT TO authenticated
  USING (public.can_view_post(post_id));
CREATE POLICY "post_reactions_insert_own" ON public.post_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_view_post(post_id));
CREATE POLICY "post_reactions_update_own" ON public.post_reactions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "post_reactions_delete_own" ON public.post_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "connections_read_involved" ON public.connections FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "connections_insert_own" ON public.connections FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());
CREATE POLICY "connections_update_involved" ON public.connections FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid())
  WITH CHECK (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "connections_delete_involved" ON public.connections FOR DELETE TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "follows_read" ON public.follows FOR SELECT TO authenticated
  USING (follower_id = auth.uid() OR following_id = auth.uid());
CREATE POLICY "follows_insert_own" ON public.follows FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid());
CREATE POLICY "follows_delete_own" ON public.follows FOR DELETE TO authenticated
  USING (follower_id = auth.uid());

CREATE POLICY "saved_items_own" ON public.saved_items FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "saved_items_insert_own" ON public.saved_items FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "saved_items_delete_own" ON public.saved_items FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- indexes
CREATE INDEX posts_author_created_idx ON public.posts (author_id, created_at DESC);
CREATE INDEX posts_created_idx ON public.posts (created_at DESC);
CREATE INDEX post_comments_post_idx ON public.post_comments (post_id, created_at);
CREATE INDEX post_reactions_post_idx ON public.post_reactions (post_id);
CREATE INDEX connections_addressee_idx ON public.connections (addressee_id, status);
CREATE INDEX connections_requester_idx ON public.connections (requester_id, status);
CREATE INDEX follows_following_idx ON public.follows (following_id);

-- updated_at triggers
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_post_comments_updated_at BEFORE UPDATE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- counters + notifications
CREATE OR REPLACE FUNCTION public.handle_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author UUID;
  v_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id
      RETURNING author_id INTO v_author;
    IF v_author IS NOT NULL AND v_author <> NEW.author_id THEN
      SELECT full_name INTO v_name FROM public.profiles WHERE id = NEW.author_id;
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (v_author, 'comment', COALESCE(v_name, 'Someone') || ' commented on your post',
              left(NEW.body, 140), '/feed');
    END IF;
    RETURN NEW;
  ELSE
    UPDATE public.posts SET comment_count = greatest(comment_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_post_comment() FROM PUBLIC;

CREATE TRIGGER post_comments_counter
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.handle_post_comment();

CREATE OR REPLACE FUNCTION public.handle_post_reaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author UUID;
  v_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET reaction_count = reaction_count + 1 WHERE id = NEW.post_id
      RETURNING author_id INTO v_author;
    IF v_author IS NOT NULL AND v_author <> NEW.user_id THEN
      SELECT full_name INTO v_name FROM public.profiles WHERE id = NEW.user_id;
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (v_author, 'reaction', COALESCE(v_name, 'Someone') || ' reacted to your post', NULL, '/feed');
    END IF;
    RETURN NEW;
  ELSE
    UPDATE public.posts SET reaction_count = greatest(reaction_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_post_reaction() FROM PUBLIC;

CREATE TRIGGER post_reactions_counter
AFTER INSERT OR DELETE ON public.post_reactions
FOR EACH ROW EXECUTE FUNCTION public.handle_post_reaction();

CREATE OR REPLACE FUNCTION public.handle_connection_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT full_name INTO v_name FROM public.profiles WHERE id = NEW.requester_id;
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (NEW.addressee_id, 'connection', COALESCE(v_name, 'Someone') || ' wants to connect',
            NEW.message, '/network');
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
    SELECT full_name INTO v_name FROM public.profiles WHERE id = NEW.addressee_id;
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (NEW.requester_id, 'connection', COALESCE(v_name, 'Someone') || ' accepted your connection request',
            NULL, '/network');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_connection_change() FROM PUBLIC;

CREATE TRIGGER connections_notify
AFTER INSERT OR UPDATE ON public.connections
FOR EACH ROW EXECUTE FUNCTION public.handle_connection_change();