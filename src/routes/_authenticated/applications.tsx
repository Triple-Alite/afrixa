import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PaperPlaneTilt, ShieldCheck } from "@phosphor-icons/react";
import { toast } from "sonner";

import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { advanceEscrow, listTalentApplications } from "@/lib/hiring.functions";
import { money } from "@/lib/afrixa";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/applications")({
  head: () => ({
    meta: [
      { title: "My applications — Afrixa" },
      {
        name: "description",
        content: "Track every Afrixa proposal you sent, see which clients hired you and move escrow work forward.",
      },
      { property: "og:title", content: "My applications — Afrixa" },
      {
        property: "og:description",
        content: "Proposal status, hires and escrow progress for African talent on Afrixa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApplicationsPage,
});

const STAGE_LABEL: Record<string, string> = {
  funded: "Escrow funded — start work",
  in_progress: "In progress",
  delivered: "Delivered — awaiting release",
  released: "Payment released",
};

function ApplicationsPage() {
  const queryClient = useQueryClient();
  const fetchApplications = useServerFn(listTalentApplications);
  const advance = useServerFn(advanceEscrow);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["talent-applications"],
    queryFn: () => fetchApplications(),
  });

  const escrowMutation = useMutation({
    mutationFn: (input: { escrowId: string; action: "start" | "deliver" }) => advance({ data: input }),
    onSuccess: async () => {
      toast.success("Escrow updated");
      await queryClient.invalidateQueries({ queryKey: ["talent-applications"] });
      await queryClient.invalidateQueries({ queryKey: ["wallet-escrows"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Could not update escrow"),
  });

  return (
    <AppShell>
      <ScreenHeader title="My applications" subtitle="Proposals, hires and escrow progress" back />
      <main className="space-y-3 px-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading applications…</p>
        ) : applications.length ? (
          applications.map((application) => (
            <article key={application.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to="/jobs/$id"
                    params={{ id: application.opportunity_id }}
                    className="text-sm font-semibold underline-offset-2 hover:underline"
                  >
                    {application.opportunity_title}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{application.opportunity_company}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${
                    application.status === "accepted"
                      ? "bg-secondary/15 text-secondary"
                      : application.status === "declined"
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary"
                  }`}
                >
                  {application.status}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-3 text-xs">
                <span className="font-semibold">
                  {application.bid_amount ? money(Number(application.bid_amount), application.currency) : "No bid"}
                </span>
                {application.delivery_days ? (
                  <span className="text-muted-foreground">{application.delivery_days} days delivery</span>
                ) : null}
                <span className="text-muted-foreground">
                  {new Date(application.created_at).toLocaleDateString()}
                </span>
              </div>

              {application.escrow_status ? (
                <>
                  <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-1 text-[11px] font-semibold text-secondary">
                    <ShieldCheck size={13} weight="fill" />{" "}
                    {STAGE_LABEL[application.escrow_status] ?? application.escrow_status.replaceAll("_", " ")}
                  </p>
                  {application.escrow_id && application.escrow_status === "funded" ? (
                    <Button
                      className="mt-3 h-11 w-full"
                      disabled={escrowMutation.isPending}
                      onClick={() =>
                        escrowMutation.mutate({ escrowId: application.escrow_id as string, action: "start" })
                      }
                    >
                      Start work
                    </Button>
                  ) : null}
                  {application.escrow_id && application.escrow_status === "in_progress" ? (
                    <Button
                      variant="secondary"
                      className="mt-3 h-11 w-full"
                      disabled={escrowMutation.isPending}
                      onClick={() =>
                        escrowMutation.mutate({ escrowId: application.escrow_id as string, action: "deliver" })
                      }
                    >
                      Mark delivered
                    </Button>
                  ) : null}
                </>
              ) : application.status === "submitted" ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Waiting for the client to review and fund escrow.
                </p>
              ) : null}
            </article>
          ))
        ) : (
          <section className="rounded-2xl border border-dashed border-border p-8 text-center">
            <PaperPlaneTilt size={30} className="mx-auto text-secondary" />
            <h2 className="mt-3 text-base font-semibold">No applications yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Apply to a job or gig and its approval progress shows up here.
            </p>
            <Link
              to="/explore"
              className="mt-4 inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
            >
              Browse opportunities
            </Link>
          </section>
        )}
      </main>
    </AppShell>
  );
}
