ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS resume_url text,
  ADD COLUMN IF NOT EXISTS resume_name text,
  ADD COLUMN IF NOT EXISTS portfolio_urls text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS years_experience text;