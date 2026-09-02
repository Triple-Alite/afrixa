import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bank, ShieldCheck, Wallet } from "@phosphor-icons/react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { advanceEscrow } from "@/lib/hiring.functions";
import { money } from "@/lib/afrixa";
import { Button } from "@/components/ui/button";

type Escrow = {
  id: string;
  title: string;
  company: string | null;
  amount: number;
  currency: string;
  status: string;
  client_id: string | null;
  talent_id: string | null;
};


type Transaction = {
  id: string;
  amount: number;
  currency: string;
  type: string;
  description: string | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet and escrow — Afrixa" },
      {
        name: "description",
        content: "Track Afrixa escrow balances, releases, payout methods and work-related transactions.",
      },
      { property: "og:title", content: "Wallet and escrow — Afrixa" },
      {
        property: "og:description",
        content: "Your protected Afrixa payments, escrow milestones and payout readiness.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const { user } = useAuth();

  const { data: escrows = [], isLoading } = useQuery({
    queryKey: ["wallet-escrows", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("escrows")
        .select("id,title,company,amount,currency,status,client_id,talent_id")
        .or(`client_id.eq.${user.id},talent_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("transactions")
        .select("id,amount,currency,type,description,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  const queryClient = useQueryClient();
  const advance = useServerFn(advanceEscrow);
  const escrowMutation = useMutation({
    mutationFn: (input: { escrowId: string; action: "start" | "deliver" | "release" }) => advance({ data: input }),
    onSuccess: async () => {
      toast.success("Escrow updated");
      await queryClient.invalidateQueries({ queryKey: ["wallet-escrows", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["transactions", user?.id] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not update this escrow"),
  });

  const balance = escrows.reduce((total: number, item: Escrow) => total + Number(item.amount), 0);


  return (
    <AppShell>
      <ScreenHeader title="Wallet" subtitle="Escrow and payouts" back />
      <main className="space-y-5 px-4">
        <section className="surface-hero rounded-2xl p-5 text-primary-foreground shadow-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-primary-foreground/70">Protected balance</p>
              <p className="mt-1 text-3xl font-bold">{money(balance)}</p>
            </div>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15">
              <Wallet size={24} weight="bold" />
            </span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-white/12 p-3">
              <p className="text-primary-foreground/70">Escrows</p>
              <p className="font-semibold">{escrows.length}</p>
            </div>
            <div className="rounded-xl bg-white/12 p-3">
              <p className="text-primary-foreground/70">Currency</p>
              <p className="font-semibold">USD</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Payout method</h2>
              <p className="mt-1 text-xs text-muted-foreground">Bank and mobile money support</p>
            </div>
            <Button variant="outline" size="icon" aria-label="Add payout method">
              <Bank size={18} />
            </Button>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold">Active escrows</h2>
          <div className="mt-3 space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading escrow activity…</p>
            ) : escrows.length ? (
              escrows.map((escrow: Escrow) => (
                <article key={escrow.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">{escrow.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{escrow.company ?? "Afrixa escrow"}</p>
                    </div>
                    <p className="text-sm font-bold">{money(escrow.amount, escrow.currency)}</p>
                  </div>
                  <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-1 text-[11px] font-semibold text-secondary">
                    <ShieldCheck size={13} weight="fill" /> {escrow.status.replaceAll("_", " ")}
                  </p>
                </article>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Escrow activity appears here when funded work starts.
              </p>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold">Recent transactions</h2>
          <div className="mt-3 space-y-2">
            {transactions.map((transaction: Transaction) => (
              <article key={transaction.id} className="flex items-center justify-between rounded-xl bg-muted p-3">
                <div>
                  <p className="text-sm font-medium">{transaction.description ?? transaction.type}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-sm font-semibold">{money(transaction.amount, transaction.currency)}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}