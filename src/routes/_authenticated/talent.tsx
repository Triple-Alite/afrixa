import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlass, ShieldCheck } from "@phosphor-icons/react";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { initials } from "@/lib/afrixa";
import { Input } from "@/components/ui/input";

type TalentRow = {
  id: string;
  full_name: string;
  headline: string | null;
  country: string | null;
  primary_skill: string | null;
  avatar_url: string | null;
  verified: boolean;
  hourly_rate: number | null;
  profile_strength: number;
};

export const Route = createFileRoute("/_authenticated/talent")({
  head: () => ({
    meta: [
      { title: "Find talent — Afrixa" },
      {
        name: "description",
        content: "Browse verified African talent on Afrixa by skill, country and assessment level.",
      },
      { property: "og:title", content: "Find talent — Afrixa" },
      { property: "og:description", content: "Discover vetted freelancers and specialists ready to hire on Afrixa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TalentDirectory,
});

function TalentDirectory() {
  const [term, setTerm] = useState("");

  const { data: talent = [], isLoading } = useQuery({
    queryKey: ["talent-directory"],
    queryFn: async (): Promise<TalentRow[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,headline,country,primary_skill,avatar_url,verified,hourly_rate,profile_strength")
        .eq("role", "talent")
        .eq("onboarding_complete", true)
        .eq("discoverable", true)
        .order("profile_strength", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  const query = term.trim().toLowerCase();
  const results = query
    ? talent.filter((person) =>
        [person.full_name, person.headline, person.primary_skill, person.country]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query)),
      )
    : talent;

  return (
    <AppShell>
      <ScreenHeader title="Find talent" subtitle="Verified professionals across Africa" back />
      <main className="space-y-4 px-4">
        <div className="relative">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search skill, name or country"
            className="h-12 rounded-xl pl-10"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading talent…</p>
        ) : results.length ? (
          <div className="space-y-3">
            {results.map((person) => (
              <Link
                key={person.id}
                to="/talent/$id"
                params={{ id: person.id }}
                className="block rounded-2xl border border-border bg-card p-4 shadow-card"
              >
                <div className="flex items-start gap-3">
                  {person.avatar_url ? (
                    <img
                      src={person.avatar_url}
                      alt={person.full_name}
                      className="size-12 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                      {initials(person.full_name)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="truncate text-sm font-semibold">{person.full_name || "Afrixa talent"}</h2>
                      {person.verified ? <ShieldCheck size={14} weight="fill" className="text-secondary" /> : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {person.headline ?? person.primary_skill ?? "Talent"}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {person.country ?? "Africa"}
                      {person.hourly_rate ? ` · $${person.hourly_rate}/hr` : ""}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No talent matches that search yet.
          </p>
        )}
      </main>
    </AppShell>
  );
}
