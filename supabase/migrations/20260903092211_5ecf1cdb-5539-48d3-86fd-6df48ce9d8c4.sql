ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';

CREATE OR REPLACE FUNCTION public.validate_opportunity_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('open', 'in_progress', 'completed') THEN
    RAISE EXCEPTION 'Invalid opportunity status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS opportunities_validate_status ON public.opportunities;
CREATE TRIGGER opportunities_validate_status
  BEFORE INSERT OR UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.validate_opportunity_status();

UPDATE public.opportunities o
SET status = 'in_progress'
WHERE EXISTS (
  SELECT 1 FROM public.escrows e
  WHERE e.opportunity_id = o.id AND e.status IN ('funded', 'in_progress', 'delivered')
);

UPDATE public.opportunities o
SET status = 'completed'
WHERE EXISTS (
  SELECT 1 FROM public.escrows e
  WHERE e.opportunity_id = o.id AND e.status = 'released'
);
