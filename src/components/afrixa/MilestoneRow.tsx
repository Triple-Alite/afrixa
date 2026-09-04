import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { money } from "@/lib/afrixa";
import { advanceMilestone, type Milestone } from "@/lib/contracts.functions";
import { cn } from "@/lib/utils";

const STATUS_META: Record<string, { label: string; tone: string }> = {
  planned: { label: "Awaiting funding", tone: "bg-muted text-muted-foreground" },
  funded: { label: "Funded", tone: "bg-gold/15 text-gold-foreground" },
  in_progress: { label: "In progress", tone: "bg-gold/15 text-gold-foreground" },
  submitted: { label: "Submitted for review", tone: "bg-primary/10 text-primary" },
  paid: { label: "Approved & paid", tone: "bg-secondary/12 text-secondary" },
  approved: { label: "Approved", tone: "bg-secondary/12 text-secondary" },
  cancelled: { label: "Cancelled", tone: "bg-destructive/10 text-destructive" },
};

export function MilestoneRow({
  milestone,
  role,
}: {
  milestone: Milestone;
  role: "client" | "talent";
}) {
  const queryClient = useQueryClient();
  const advance = useServerFn(advanceMilestone);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");
  const [url, setUrl] = useState("");

  const act = useMutation({
    mutationFn: (input: {
      action: "fund" | "start" | "submit" | "approve" | "cancel";
      note?: string;
      url?: string;
    }) =>
      advance({
        data: {
          milestoneId: milestone.id,
          action: input.action,
          ...(input.note ? { note: input.note } : {}),
          ...(input.url ? { url: input.url } : {}),
        },
      }),
    onSuccess: (_result, variables) => {
      setSubmitting(false);
      setNote("");
      setUrl("");
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      const messages: Record<string, string> = {
        fund: "Milestone funded from your wallet",
        start: "Work started",
        submit: "Work submitted for review",
        approve: "Approved — payment released",
        cancel: "Milestone cancelled and refunded",
      };
      toast.success(messages[variables.action] ?? "Updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const meta = STATUS_META[milestone.status] ?? STATUS_META["planned"]!;
  const isClient = role === "client";

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {milestone.position}. {milestone.title}
          </p>
          {milestone.description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{milestone.description}</p>
          ) : null}
          <p className="mt-1 text-xs font-medium">
            {money(milestone.amount, milestone.currency)}
            {milestone.due_date ? (
              <span className="font-normal text-muted-foreground">
                {" "}
                · due {new Date(milestone.due_date).toLocaleDateString()}
              </span>
            ) : null}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
            meta.tone,
          )}
        >
          {meta.label}
        </span>
      </div>

      {milestone.status === "submitted" && (milestone.deliverable_note || milestone.deliverable_url) ? (
        <div className="mt-2 rounded-lg bg-muted/60 p-2 text-xs">
          {milestone.deliverable_note ? <p>{milestone.deliverable_note}</p> : null}
          {milestone.deliverable_url ? (
            <a
              href={milestone.deliverable_url}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1 block truncate font-semibold text-primary"
            >
              {milestone.deliverable_url}
            </a>
          ) : null}
        </div>
      ) : null}

      {submitting ? (
        <div className="mt-2 space-y-2">
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What did you deliver?"
            rows={2}
          />
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="Link to the work (optional)"
            inputMode="url"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              disabled={act.isPending}
              onClick={() => act.mutate({ action: "submit", note, url })}
            >
              {act.isPending ? "Submitting…" : "Send for review"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSubmitting(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {isClient && milestone.status === "planned" ? (
            <Button size="sm" disabled={act.isPending} onClick={() => act.mutate({ action: "fund" })}>
              Fund from wallet
            </Button>
          ) : null}
          {!isClient && milestone.status === "funded" ? (
            <Button size="sm" disabled={act.isPending} onClick={() => act.mutate({ action: "start" })}>
              Start work
            </Button>
          ) : null}
          {!isClient && ["funded", "in_progress"].includes(milestone.status) ? (
            <Button size="sm" variant="outline" onClick={() => setSubmitting(true)}>
              Submit work
            </Button>
          ) : null}
          {isClient && milestone.status === "submitted" ? (
            <Button
              size="sm"
              disabled={act.isPending}
              onClick={() => act.mutate({ action: "approve" })}
            >
              Approve & release
            </Button>
          ) : null}
          {isClient && !["paid", "cancelled"].includes(milestone.status) ? (
            <Button
              size="sm"
              variant="outline"
              disabled={act.isPending}
              onClick={() => act.mutate({ action: "cancel" })}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
