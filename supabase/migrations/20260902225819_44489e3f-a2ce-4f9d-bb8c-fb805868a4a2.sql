ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance numeric NOT NULL DEFAULT 0;

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  reference text NOT NULL UNIQUE,
  purpose text NOT NULL DEFAULT 'escrow',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'pending',
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL,
  escrow_id uuid REFERENCES public.escrows(id) ON DELETE SET NULL,
  authorization_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX payments_reference_idx ON public.payments (reference);
CREATE INDEX payments_user_created_idx ON public.payments (user_id, created_at DESC);

CREATE TRIGGER payments_set_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.escrows ADD COLUMN IF NOT EXISTS funding_source text NOT NULL DEFAULT 'card';
ALTER TABLE public.escrows ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.protect_profile_trust_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    NEW.verified := OLD.verified;
    NEW.total_earned := OLD.total_earned;
    NEW.wallet_balance := OLD.wallet_balance;
  END IF;
  RETURN NEW;
END;
$function$;