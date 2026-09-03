ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_gateway text;

ALTER TABLE public.payout_methods ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;
ALTER TABLE public.payout_methods ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.payout_methods ADD COLUMN IF NOT EXISTS bank_code text;
ALTER TABLE public.payout_methods ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

CREATE TRIGGER payout_methods_set_updated_at
  BEFORE UPDATE ON public.payout_methods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();