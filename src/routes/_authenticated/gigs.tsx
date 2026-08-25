import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { CurrencyDollar, Timer, Toolbox } from "@phosphor-icons/react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { SKILLS } from "@/lib/afrixa";
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
    <AppShell>
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
    </AppShell>
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