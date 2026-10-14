import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle, Plus, Wallet } from "@phosphor-icons/react";
import { toast } from "sonner";

import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { MilestoneRow } from "@/components/afrixa/MilestoneRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { money } from "@/lib/afrixa";
import { addMilestone, createContract, listMyContracts } from "@/lib/contracts.functions";
import { listClientProposals } from "@/lib/hiring.functions";

export const Route = createFileRoute("/_authenticated/contracts")({
  head: () => ({
    meta: [
      { title: "Contracts & milestones — Afrixa" },
      {
        name: "description",
        content:
          "Track funded milestones on every Afrixa contract: fund a step, start work, submit deliverables and approve to release payment.",
      },
      { property: "og:title", content: "Contracts & milestones — Afrixa" },
      {
        property: "og:description",
        content: "Fund milestones, submit work and approve payments on your Afrixa contracts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContractsPage,
});

function ContractsPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const isClient = profile?.role === "client";

  const fetchContracts = useServerFn(listMyContracts);
  const fetchProposals = useServerFn(listClientProposals);
  const create = useServerFn(createContract);
  const addStep = useServerFn(addMilestone);

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => fetchContracts(),
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ["client-proposals", "for-contracts"],
    enabled: isClient,
    queryFn: () => fetchProposals(),
  });

  const [milestoneFor, setMilestoneFor] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  const startContract = useMutation({
    mutationFn: (input: { proposalId: string; title: string }) => create({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contract created — add your milestones");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveMilestone = useMutation({
    mutationFn: async (contractId: string) =>
      addStep({
        data: {
          contractId,
          title: title.trim(),
          amount: Number(amount),
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(dueDate ? { dueDate } : {}),
        },
      }),
    onSuccess: () => {
      setMilestoneFor(null);
      setTitle("");
      setDescription("");
      setAmount("");
      setDueDate("");
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Milestone added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const contractedProposals = new Set(
    contracts.map((contract) => contract.proposal_id).filter(Boolean) as string[],
  );
  const hireable = proposals.filter(
    (proposal) => proposal.status === "accepted" && !contractedProposals.has(proposal.id),
  );

  return (
    <AppShell>
      <ScreenHeader
        title="Contracts"
        subtitle="Milestones, funding and approvals"
        back
        action={
          <Link
            to="/wallet"
            aria-label="Wallet"
            className="flex size-9 items-center justify-center rounded-full border border-border bg-card"
          >
            <Wallet size={18} />
          </Link>
        }
      />

      <div className="space-y-4 px-4 pb-6">
        {hireable.length > 0 ? (
          <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Ready for a contract</h2>
            <p className="text-xs text-muted-foreground">
              You accepted these freelancers — set up a contract to plan milestones.
            </p>
            {hireable.map((proposal) => (
              <div
                key={proposal.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
              >
                <div className="min-w-0">
                  <Link
                    to="/talent/$id"
                    params={{ id: proposal.talent_id }}
                    className="block truncate text-sm font-semibold hover:underline"
                  >
                    {proposal.talent_name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {proposal.opportunity_title}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={startContract.isPending}
                  onClick={() =>
                    startContract.mutate({
                      proposalId: proposal.id,
                      title: proposal.opportunity_title,
                    })
                  }
                >
                  Create
                </Button>
              </div>
            ))}
          </section>
        ) : null}

        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading contracts…</p>
        ) : contracts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-sm font-semibold">No contracts yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isClient
                ? "Accept a proposal, then create a contract to break the work into funded milestones."
                : "Once a client hires you, your contract and its milestones appear here."}
            </p>
          </div>
        ) : (
          contracts.map((contract) => {
            const total = contract.milestones
              .filter((m) => m.status !== "cancelled")
              .reduce((sum, m) => sum + m.amount, 0);
            const progress = total > 0 ? Math.round((contract.paid_total / total) * 100) : 0;
            return (
              <article
                key={contract.id}
                className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <header className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-semibold">{contract.title}</h2>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                      {contract.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {contract.role === "client" ? "Freelancer" : "Client"}:{" "}
                    <Link
                      to="/talent/$id"
                      params={{ id: contract.role === "client" ? contract.talent_id : contract.client_id }}
                      className="font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      {contract.counterparty_name}
                    </Link>
                  </p>
                  <div className="pt-1">
                    <Progress value={progress} className="h-1.5" />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {money(contract.paid_total, contract.currency)} paid ·{" "}
                      {money(contract.funded_total, contract.currency)} in escrow ·{" "}
                      {money(total, contract.currency)} planned
                    </p>
                  </div>
                </header>

                <div className="space-y-2">
                  {contract.milestones.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                      No milestones yet.
                    </p>
                  ) : (
                    contract.milestones.map((milestone) => (
                      <MilestoneRow
                        key={milestone.id}
                        milestone={milestone}
                        role={contract.role}
                      />
                    ))
                  )}
                </div>

                {contract.role === "client" && contract.status === "active" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setMilestoneFor(contract.id)}
                  >
                    <Plus size={16} /> Add milestone
                  </Button>
                ) : null}

                {contract.status === "completed" ? (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-secondary">
                    <CheckCircle size={14} weight="fill" /> All milestones approved and paid
                  </p>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      <Dialog
        open={Boolean(milestoneFor)}
        onOpenChange={(open) => {
          if (!open) setMilestoneFor(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add a milestone</DialogTitle>
            <DialogDescription>
              Fund each milestone separately. The freelancer is paid when you approve the work.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Milestone title"
            />
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What should be delivered? (optional)"
              rows={3}
            />
            <Input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Amount"
              inputMode="decimal"
            />
            <Input
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              type="date"
              aria-label="Due date"
            />
            <Button
              className="w-full"
              disabled={!title.trim() || !Number(amount) || saveMilestone.isPending}
              onClick={() => milestoneFor && saveMilestone.mutate(milestoneFor)}
            >
              {saveMilestone.isPending ? "Saving…" : "Add milestone"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
