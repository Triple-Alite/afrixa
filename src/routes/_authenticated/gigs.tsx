import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { CurrencyDollar, Timer, Toolbox } from "@phosphor-icons/react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { GigCard } from "@/components/afrixa/OpportunityCard";
import { useAuth } from "@/hooks/useAuth";
import { SKILLS, type Opportunity } from "@/lib/afrixa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/gigs")({
  head: () => ({
    meta: [
      { title: "Post a gig — Afrixa" },
      {
        name: "description",
        content: "Create a paid gig on Afrixa with clear scope, delivery timing and escrow-ready pricing.",
      },
      { property: "og:title", content: "Post a gig — Afrixa" },
      {
        property: "og:description",
        content: "Publish a gig and connect with verified African talent through secure escrow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GigsPage,
});

function GigsPage() {
  const { user, profile } = useAuth();
  const isClient = profile?.role === "client";

  return (
    <AppShell>
      {isClient ? (
        <PostGigForm user={user} profile={profile} />
      ) : (
        <TalentGigsFeed />
      )}
    </AppShell>
  );
}

function TalentGigsFeed() {
  const { data: gigs = [], isLoading } = useQuery({
    queryKey: ["opportunities", "gigs-feed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .eq("category", "gig")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Opportunity[];
    },
  });

  return (
    <>
      <ScreenHeader title="Gigs" subtitle="Paid gigs you can apply for today" />
      <main className="space-y-3 px-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading gigs…</p>
        ) : gigs.length ? (
          gigs.map((gig) => <GigCard key={gig.id} opportunity={gig} />)
        ) : (
          <section className="rounded-2xl border border-dashed border-border p-8 text-center">
            <Toolbox size={32} className="mx-auto text-secondary" />
            <h2 className="mt-3 text-base font-semibold">No gigs yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Check back soon — new client gigs land here as they're published.
            </p>
          </section>
        )}
      </main>
    </>
  );
}

function PostGigForm({
  user,
  profile,
}: {
  user: ReturnType<typeof useAuth>["user"];
  profile: ReturnType<typeof useAuth>["profile"];
}) {
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skill, setSkill] = useState("");
  const [price, setPrice] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("7");

  const publish = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in again to post a gig");
      const amount = Number(price);
      const days = Number(deliveryDays);
      if (!title.trim() || !description.trim() || !skill || !amount || !days) {
        throw new Error("Add a title, brief, skill, price and delivery time");
      }
      const opportunity = {
        title: title.trim(),
        description: description.trim(),
        category: "gig",
        company: profile?.business_name ?? profile?.full_name ?? "Afrixa client",
        client_id: user.id,
        country: profile?.country ?? null,
        currency: "USD",
        price_from: amount,
        delivery_days: days,
        escrow_funded: true,
        skills: [skill],
        work_mode: "Remote",
      };
      const { data, error } = await supabase
        .from("opportunities")
        .insert(opportunity)
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      toast.success("Gig published");
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      navigate({ to: "/jobs/$id", params: { id } });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not publish gig"),
  });

  return (
    <>
      <ScreenHeader title="Post a gig" subtitle="Scope the work and protect payment" />
      <main className="space-y-5 px-4">
        <section className="grid grid-cols-3 gap-2">
          <Stat icon={<Toolbox size={18} />} label="Scope" value="Fixed" />
          <Stat icon={<CurrencyDollar size={18} />} label="Escrow" value="Ready" />
          <Stat icon={<Timer size={18} />} label="Payout" value="Fast" />
        </section>

        <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="space-y-1.5">
            <Label htmlFor="gig-title">Gig title</Label>
            <Input
              id="gig-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Design a conversion-ready landing page"
              className="h-12 bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gig-brief">Brief</Label>
            <Textarea
              id="gig-brief"
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe deliverables, review rounds and what the talent needs to start."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Primary skill</Label>
            <Select value={skill} onValueChange={setSkill}>
              <SelectTrigger className="h-12 bg-background">
                <SelectValue placeholder="Choose skill" />
              </SelectTrigger>
              <SelectContent>
                {SKILLS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="gig-price">Price from USD</Label>
              <Input
                id="gig-price"
                type="number"
                min="1"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="500"
                className="h-12 bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gig-days">Delivery days</Label>
              <Input
                id="gig-days"
                type="number"
                min="1"
                value={deliveryDays}
                onChange={(event) => setDeliveryDays(event.target.value)}
                className="h-12 bg-background"
              />
            </div>
          </div>

          <Button className="h-12 w-full" disabled={publish.isPending} onClick={() => publish.mutate()}>
            {publish.isPending ? "Publishing…" : "Publish gig"}
          </Button>
        </section>
      </main>
    </>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
      <span className="text-secondary">{icon}</span>
      <p className="mt-2 text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}