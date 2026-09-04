import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle, CreditCard, Paperclip, Wallet, XCircle } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { declineProposal, listClientProposals, type ClientProposal } from "@/lib/hiring.functions";
import { fundHire, getWalletBalance } from "@/lib/payments.functions";
import { money } from "@/lib/afrixa";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/proposals")({
  validateSearch: (search: Record<string, unknown>): { job?: string } => {
    const job = typeof search["job"] === "string" ? search["job"] : undefined;
    return { ...(job ? { job } : {}) };
  },
  head: () => ({
    meta: [
      { title: "Proposals received — Afrixa" },
      {
        name: "description",
        content: "Review proposals from Afrixa talent, compare bids and hire with escrow protection.",
      },
      { property: "og:title", content: "Proposals received — Afrixa" },
      { property: "og:description", content: "Compare Afrixa bids and hire talent with funds held in escrow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProposalsPage,
});

function ProposalsPage() {
  const queryClient = useQueryClient();
  const fetchProposals = useServerFn(listClientProposals);
  const fetchBalance = useServerFn(getWalletBalance);
  const fund = useServerFn(fundHire);
  const decline = useServerFn(declineProposal);

  const [funding, setFunding] = useState<ClientProposal | null>(null);

  const { job } = Route.useSearch();

  const { data: allProposals = [], isLoading } = useQuery({
    queryKey: ["client-proposals"],
    queryFn: () => fetchProposals(),
  });

  const proposals = job ? allProposals.filter((item) => item.opportunity_id === job) : allProposals;

  const { data: wallet } = useQuery({ queryKey: ["wallet-balance"], queryFn: () => fetchBalance() });

  const fundMutation = useMutation({
    mutationFn: (input: { proposalId: string; method: "card" | "wallet"; provider?: "paystack" | "flutterwave" }) =>
      fund({ data: input }),
    onSuccess: async (result) => {
      if (result.method === "card" && "authorizationUrl" in result) {
        toast.info("Opening secure checkout…");
        window.location.href = result.authorizationUrl;
        return;
      }
      setFunding(null);
      toast.success(`Hired — ${money(result.amount, result.currency)} held in escrow`);
      await queryClient.invalidateQueries({ queryKey: ["client-proposals"] });
      await queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
      await queryClient.invalidateQueries({ queryKey: ["wallet-escrows"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Could not fund this hire"),
  });

  const declineMutation = useMutation({
    mutationFn: (proposalId: string) => decline({ data: { proposalId } }),
    onSuccess: async () => {
      toast.success("Proposal declined");
      await queryClient.invalidateQueries({ queryKey: ["client-proposals"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Could not decline"),
  });

  const busy = fundMutation.isPending || declineMutation.isPending;

  return (
    <AppShell>
      <ScreenHeader title="Proposals" subtitle="Talent applying to your postings" back />
      <main className="space-y-3 px-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading proposals…</p>
        ) : proposals.length ? (
          proposals.map((proposal) => (
            <article key={proposal.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to="/talent/$id"
                    params={{ id: proposal.talent_id }}
                    className="text-sm font-semibold underline-offset-2 hover:underline"
                  >
                    {proposal.talent_name}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {proposal.talent_headline ?? proposal.talent_country ?? "Afrixa talent"}
                  </p>
                  <p className="mt-2 text-xs font-medium text-primary">{proposal.opportunity_title}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${
                    proposal.status === "accepted"
                      ? "bg-secondary/15 text-secondary"
                      : proposal.status === "declined"
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary"
                  }`}
                >
                  {proposal.status}
                </span>
              </div>

              <p className="mt-3 line-clamp-4 text-xs text-muted-foreground">{proposal.cover_letter}</p>

              {proposal.resume_url || proposal.portfolio_urls.length || proposal.years_experience ? (
                <div className="mt-3 space-y-1.5 rounded-xl bg-muted/50 p-3">
                  {proposal.years_experience ? (
                    <p className="text-[11px] text-muted-foreground">
                      Experience: <span className="font-medium">{proposal.years_experience}</span>
                    </p>
                  ) : null}
                  {proposal.resume_url ? (
                    <a
                      href={proposal.resume_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs font-semibold text-primary"
                    >
                      <Paperclip size={14} /> {proposal.resume_name ?? "Resume / CV"}
                    </a>
                  ) : null}
                  {proposal.portfolio_urls.map((url, index) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary"
                    >
                      <Paperclip size={14} /> Portfolio sample {index + 1}
                    </a>
                  ))}
                </div>
              ) : null}

              <div className="mt-3 flex items-center gap-3 text-xs">
                <span className="font-semibold">
                  {proposal.bid_amount ? money(Number(proposal.bid_amount), proposal.currency) : "No bid"}
                </span>
                {proposal.delivery_days ? (
                  <span className="text-muted-foreground">{proposal.delivery_days} days delivery</span>
                ) : null}
              </div>

              {proposal.status === "submitted" ? (
                <div className="mt-4 flex gap-2">
                  <Button className="h-11 flex-1" disabled={busy} onClick={() => setFunding(proposal)}>
                    <CheckCircle size={16} /> Hire &amp; fund escrow
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 bg-card"
                    disabled={busy}
                    onClick={() => declineMutation.mutate(proposal.id)}
                  >
                    <XCircle size={16} /> Decline
                  </Button>
                </div>
              ) : proposal.status === "accepted" ? (
                <Link
                  to="/wallet"
                  className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md bg-secondary text-sm font-medium text-secondary-foreground"
                >
                  Manage escrow
                </Link>
              ) : null}
            </article>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No proposals yet. Post a job or gig and talent will apply here.
          </p>
        )}
      </main>

      <Dialog open={Boolean(funding)} onOpenChange={(open) => !open && setFunding(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Fund escrow</DialogTitle>
            <DialogDescription>
              {funding
                ? `${money(Number(funding.bid_amount ?? 0), funding.currency)} for ${funding.opportunity_title}. Funds stay in escrow until you release them.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Button
              className="h-12 w-full justify-start"
              disabled={busy || !funding}
              onClick={() =>
                funding && fundMutation.mutate({ proposalId: funding.id, method: "card", provider: "paystack" })
              }
            >
              <CreditCard size={18} /> Pay with Paystack
            </Button>
            <Button
              variant="outline"
              className="h-12 w-full justify-start bg-card"
              disabled={busy || !funding}
              onClick={() =>
                funding && fundMutation.mutate({ proposalId: funding.id, method: "card", provider: "flutterwave" })
              }
            >
              <CreditCard size={18} /> Pay with Flutterwave
            </Button>
            <Button
              variant="secondary"
              className="h-12 w-full justify-start"
              disabled={busy || !funding}
              onClick={() => funding && fundMutation.mutate({ proposalId: funding.id, method: "wallet" })}
            >
              <Wallet size={18} /> Use wallet balance ({money(wallet?.balance ?? 0, wallet?.currency ?? "NGN")})
            </Button>
            <Link
              to="/payment-setup"
              className="block pt-1 text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Manage bank details and checkout method
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
