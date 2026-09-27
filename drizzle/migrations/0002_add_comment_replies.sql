ALTER TABLE public.post_comments
  ADD COLUMN parent_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE;

CREATE INDEX post_comments_parent_idx ON public.post_comments(parent_id);