import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChatCircleDots, ShieldCheck } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { initials } from "@/lib/afrixa";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/talent/$id")({
  head: () => ({
    meta: [
      { title: "Talent profile — Afrixa" },
      {
        name: "description",
        content: "View an Afrixa talent profile: skills, verified assessments, portfolio work and availability.",
      },
      { property: "og:title", content: "Talent profile — Afrixa" },
      { property: "og:description", content: "Verified Afrixa talent with portfolio work and skill assessments." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TalentProfilePage,
});

function TalentProfilePage() {
  const { id } = Route.useParams();
  const navigate = Route.useNavigate();
  const { user } = useAuth();
  const [contacting, setContacting] = useState(false);

  const { data: person, isLoading } = useQuery({
    queryKey: ["talent", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,headline,bio,country,primary_skill,years_experience,languages,avatar_url,verified,hourly_rate,profile_strength")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: portfolio = [] } = useQuery({
    queryKey: ["talent-portfolio", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_items")
        .select("id,title,category,link_url,image_url")
        .eq("user_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function contact() {
    if (!user) return;
    setContacting(true);
    try {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(participant_a.eq.${user.id},participant_b.eq.${id}),and(participant_a.eq.${id},participant_b.eq.${user.id})`,
        )
        .maybeSingle();

      let conversationId = existing?.id;
      if (!conversationId) {
        const { data, error } = await supabase
          .from("conversations")
          .insert({ participant_a: user.id, participant_b: id, subject: person?.full_name ?? "Afrixa" })
          .select("id")
          .single();
        if (error) throw error;
        conversationId = data.id;
      }
      await navigate({ to: "/messages/$id", params: { id: conversationId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start the conversation");
    } finally {
      setContacting(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <ScreenHeader title="Talent" back />
        <p className="px-4 text-sm text-muted-foreground">Loading profile…</p>
      </AppShell>
    );
  }

  if (!person) {
    return (
      <AppShell>
        <ScreenHeader title="Talent" back />
        <p className="px-4 text-sm text-muted-foreground">This profile is not available.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ScreenHeader title={person.full_name || "Talent"} subtitle={person.primary_skill ?? "Afrixa talent"} back />
      <main className="space-y-5 px-4">
        <section className="surface-hero rounded-2xl p-5 text-primary-foreground shadow-lift">
          <div className="flex items-start gap-4">
            {person.avatar_url ? (
              <img src={person.avatar_url} alt={person.full_name} className="size-16 rounded-2xl object-cover" />
            ) : (
              <span className="flex size-16 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold">
                {initials(person.full_name)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-xl font-bold">{person.full_name}</h2>
                {person.verified ? <ShieldCheck size={16} weight="fill" /> : null}
              </div>
              <p className="mt-1 text-sm text-primary-foreground/75">{person.headline ?? "Available for work"}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                {person.country ? <span className="rounded-full bg-white/15 px-2 py-1">{person.country}</span> : null}
                {person.years_experience ? (
                  <span className="rounded-full bg-white/15 px-2 py-1">{person.years_experience}</span>
                ) : null}
                {person.hourly_rate ? (
                  <span className="rounded-full bg-white/15 px-2 py-1">${person.hourly_rate}/hr</span>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs text-muted-foreground">Profile strength</p>
          <Progress value={person.profile_strength} className="mt-2 h-2" />
        </section>

        {person.bio ? (
          <section>
            <h2 className="text-base font-semibold">About</h2>
            <p className="mt-2 text-sm text-muted-foreground">{person.bio}</p>
          </section>
        ) : null}

        <section>
          <h2 className="text-base font-semibold">Portfolio</h2>
          <div className="mt-3 space-y-3">
            {portfolio.length ? (
              portfolio.map((item) => (
                <article key={item.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="mb-3 h-36 w-full rounded-xl object-cover"
                    />
                  ) : null}
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{item.category ?? "Work sample"}</p>
                </article>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No portfolio work published yet.
              </p>
            )}
          </div>
        </section>

        <Button className="h-12 w-full" disabled={contacting} onClick={() => void contact()}>
          <ChatCircleDots size={16} /> {contacting ? "Opening chat…" : "Message talent"}
        </Button>
      </main>
    </AppShell>
  );
}
