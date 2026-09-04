CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  talent_id UUID NOT NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  escrow_id UUID REFERENCES public.escrows(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Contract',
  description TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT contracts_status_check CHECK (status IN ('active','completed','cancelled')),
  CONSTRAINT contracts_parties_check CHECK (client_id <> talent_id)
);
GRANT SELECT, INSERT, UPDATE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts_read_parties" ON public.contracts FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR talent_id = auth.uid());
CREATE POLICY "contracts_insert_client" ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());
CREATE POLICY "contracts_update_client" ON public.contracts FOR UPDATE TO authenticated
  USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());

CREATE TABLE public.milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  due_date DATE,
  position INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'planned',
  deliverable_note TEXT,
  deliverable_url TEXT,
  funded_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT milestones_status_check CHECK (status IN ('planned','funded','in_progress','submitted','approved','paid','cancelled')),
  CONSTRAINT milestones_amount_check CHECK (amount >= 0)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestones TO authenticated;
GRANT ALL ON public.milestones TO service_role;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "milestones_read_parties" ON public.milestones FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = milestones.contract_id
      AND (c.client_id = auth.uid() OR c.talent_id = auth.uid())
  ));
CREATE POLICY "milestones_insert_client" ON public.milestones FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = milestones.contract_id AND c.client_id = auth.uid() AND c.status = 'active'
  ));
CREATE POLICY "milestones_update_client_planned" ON public.milestones FOR UPDATE TO authenticated
  USING (status = 'planned' AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = milestones.contract_id AND c.client_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = milestones.contract_id AND c.client_id = auth.uid()
  ));
CREATE POLICY "milestones_delete_client_planned" ON public.milestones FOR DELETE TO authenticated
  USING (status = 'planned' AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = milestones.contract_id AND c.client_id = auth.uid()
  ));

CREATE INDEX contracts_client_idx ON public.contracts (client_id, created_at DESC);
CREATE INDEX contracts_talent_idx ON public.contracts (talent_id, created_at DESC);
CREATE INDEX milestones_contract_idx ON public.milestones (contract_id, position);

CREATE TRIGGER contracts_set_updated_at BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER milestones_set_updated_at BEFORE UPDATE ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();