import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Buildings, Clock, MapPin, ShieldCheck, Star } from "@phosphor-icons/react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { EscrowBadge, SkillChip } from "@/components/afrixa/OpportunityCard";
import { budgetLabel, money, timeLeft, type Opportunity } from "@/lib/afrixa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/jobs/$id")({
  head: () => ({
    meta: [
      { title: "Opportunity details — Afrixa" },
      {
        name: "description",
        content:
          "Review the brief, budget and escrow status, then send a proposal directly to the client on Afrixa.",
      },
      { property: "og:title", content: "Opportunity details — Afrixa" },
      {
        property: "og:description",
        content: "Full brief, budget and escrow status with one-tap proposals.",
      },
    ],
  }),
  component: JobDetailPage,
});

function JobDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [cover, setCover] = useState("");
  const [bid, setBid] = useState("");
  const [days, setDays] = useState("");

  const { data: job, isLoading } = useQuery({
    queryKey: ["opportunity", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as Opportunity | null) ?? null;
    },
  });

  const { data: existing } = useQuery({
    queryKey: ["proposal", id, user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("proposals")
        .select("id,status")
        .eq("opportunity_id", id)
        .eq("talent_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const isOwner = Boolean(user?.id && job?.client_id && job.client_id === user.id);

  const { data: proposalCount = 0 } = useQuery({
    queryKey: ["opportunity-proposal-count", id],
    enabled: isOwner,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("proposals")
        .select("id", { count: "exact", head: true })
        .eq("opportunity_id", id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const apply = useMutation({
    mutationFn: async () => {
      if (!user || !job) throw new Error("Not signed in");
      const { error } = await supabase.from("proposals").insert({
        opportunity_id: job.id,
        talent_id: user.id,
        cover_letter: cover,
        bid_amount: bid ? Number(bid) : null,
        currency: job.currency,
        delivery_days: days ? Number(days) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proposal sent. The client will be notified.");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["proposal", id] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not send proposal"),
  });

  const message = useMutation({
    mutationFn: async () => {
      if (!user || !job?.client_id) throw new Error("This poster is not reachable yet");
      const { data: found, error: findError } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(participant_a.eq.${user.id},participant_b.eq.${job.client_id}),and(participant_a.eq.${job.client_id},participant_b.eq.${user.id})`,
        )
        .maybeSingle();
      if (findError) throw findError;
      if (found) return found.id;
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({ participant_a: user.id, participant_b: job.client_id, subject: job.title })
        .select("id")
        .single();
      if (error) throw error;
      return created.id;
    },
    onSuccess: (conversationId) =>
      navigate({ to: "/messages/$id", params: { id: conversationId } }),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not open chat"),
  });

  if (isLoading) {
    return (
      <AppShell>
        <ScreenHeader title="Opportunity" back />
        <p className="px-4 text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  if (!job) {
    return (
      <AppShell>
        <ScreenHeader title="Not found" back />
        <p className="px-4 text-sm text-muted-foreground">
          This opportunity is no longer available.
        </p>
      </AppShell>
    );
  }

  const left = timeLeft(job.deadline);

  return (
    <AppShell>
      <ScreenHeader title={job.category === "gig" ? "Gig" : "Opportunity"} back tone="dark" />

      <div className="surface-hero px-4 pb-10 pt-2 text-primary-foreground">
        <h1 className="text-xl font-bold leading-snug">{job.title}</h1>
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-white/70">
          <Buildings size={15} /> {job.company}
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/80">
          <span className="inline-flex items-center gap-1">
            <MapPin size={14} /> {job.country ?? "Remote"}
          </span>
          {job.work_mode ? <span>{job.work_mode}</span> : null}
          {job.job_type ? <span>{job.job_type}</span> : null}
          {left ? (
            <span className="inline-flex items-center gap-1">
              <Clock size={14} /> {left}
            </span>
          ) : null}
        </div>
      </div>

      <div className="-mt-6 space-y-4 px-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Budget</p>
              <p className="text-lg font-bold">{budgetLabel(job)}</p>
            </div>
            {job.rating ? (
              <span className="inline-flex items-center gap-1 text-sm font-medium">
                <Star size={15} weight="fill" className="text-gold" />
                {job.rating} ({job.reviews_count})
              </span>
            ) : null}
          </div>
          {job.escrow_funded ? (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary/8 p-3 text-xs text-secondary">
              <ShieldCheck size={16} weight="fill" />
              Funds are held in Afrixa escrow and released on approved delivery.
            </div>
          ) : null}
        </div>

        {job.skills.length ? (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <p className="text-sm font-semibold">Skills required</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {job.skills.map((skill) => (
                <SkillChip key={skill}>{skill}</SkillChip>
              ))}
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="text-sm font-semibold">About this role</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {job.description ?? "The client has not added a detailed brief yet."}
          </p>
          {job.experience_level ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Experience level: <span className="font-medium">{job.experience_level}</span>
            </p>
          ) : null}
          {job.escrow_funded ? (
            <div className="mt-3">
              <EscrowBadge />
            </div>
          ) : null}
        </div>

        {open ? (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
            <p className="text-sm font-semibold">Send a proposal</p>
            <div className="space-y-1.5">
              <Label htmlFor="cover">Cover letter</Label>
              <Textarea
                id="cover"
                rows={5}
                value={cover}
                onChange={(event) => setCover(event.target.value)}
                placeholder="Explain why you're the right fit and how you'll deliver."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bid">Your bid ({job.currency})</Label>
                <Input
                  id="bid"
                  type="number"
                  value={bid}
                  onChange={(event) => setBid(event.target.value)}
                  placeholder={String(job.budget_max ?? job.price_from ?? 500)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="days">Delivery (days)</Label>
                <Input
                  id="days"
                  type="number"
                  value={days}
                  onChange={(event) => setDays(event.target.value)}
                  placeholder={String(job.delivery_days ?? 7)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={apply.isPending || cover.trim().length < 20}
                onClick={() => apply.mutate()}
              >
                {apply.isPending ? "Sending…" : "Submit"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Escrow protects both sides. Payment of {money(job.budget_max ?? job.price_from, job.currency)}{" "}
              is only released when work is approved.
            </p>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-12 flex-1"
              disabled={message.isPending}
              onClick={() => message.mutate()}
            >
              Message
            </Button>
            <Button
              className="h-12 flex-1"
              disabled={Boolean(existing)}
              onClick={() => setOpen(true)}
            >
              {existing ? "Proposal sent" : "Apply now"}
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
