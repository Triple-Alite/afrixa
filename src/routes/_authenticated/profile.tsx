import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Certificate, Gear, ShieldCheck, SignOut } from "@phosphor-icons/react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { initials, money } from "@/lib/afrixa";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Afrixa" },
      {
        name: "description",
        content: "Review your Afrixa profile, portfolio, skills verification and account progress.",
      },
      { property: "og:title", content: "Profile — Afrixa" },
      {
        property: "og:description",
        content: "Afrixa profile, portfolio and verified work reputation in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, user, signOut } = useAuth();

  const { data: portfolio = [] } = useQuery({
    queryKey: ["portfolio", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("portfolio_items")
        .select("id,title,category,link_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: assessments = [] } = useQuery({
    queryKey: ["assessments", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("assessments")
        .select("id,skill,score,level,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const latestAssessment = assessments[0];

  return (
    <AppShell>
      <ScreenHeader
        title="Profile"
        subtitle={profile?.role === "client" ? "Hiring account" : "Talent account"}
        action={
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Gear size={18} />
          </Button>
        }
      />
      <main className="space-y-5 px-4">
        <section className="surface-hero rounded-2xl p-5 text-primary-foreground shadow-lift">
          <div className="flex items-start gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold">
              {initials(profile?.full_name)}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-bold">{profile?.full_name ?? "Afrixa member"}</h2>
              <p className="mt-1 text-sm text-primary-foreground/75">
                {profile?.headline ?? profile?.business_name ?? "Ready for verified work"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium">
                {profile?.verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1">
                    <ShieldCheck size={13} weight="fill" /> Verified
                  </span>
                ) : null}
                {profile?.country ? <span className="rounded-full bg-white/15 px-2 py-1">{profile.country}</span> : null}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs text-muted-foreground">Profile strength</p>
            <p className="mt-1 text-xl font-bold text-secondary">{profile?.profile_strength ?? 0}%</p>
            <Progress value={profile?.profile_strength ?? 0} className="mt-3 h-2" />
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs text-muted-foreground">Total earned</p>
            <p className="mt-1 text-xl font-bold">{money(profile?.total_earned ?? 0)}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Skill assessment</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {latestAssessment
                  ? `${latestAssessment.level} · ${latestAssessment.score}%`
                  : "Earn a visible skills badge"}
              </p>
            </div>
            <Link
              to="/assessment"
              className="inline-flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
              aria-label="Open assessment"
            >
              <Certificate size={18} weight="bold" />
            </Link>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold">Portfolio</h2>
          <div className="mt-3 space-y-3">
            {portfolio.length ? (
              portfolio.map((item) => (
                <article key={item.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{item.category ?? "Portfolio item"}</p>
                </article>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Add portfolio work from your next completed gig.
              </p>
            )}
          </div>
        </section>

        <Button variant="outline" className="h-12 w-full bg-card" onClick={() => signOut()}>
          <SignOut size={16} /> Sign out
        </Button>
      </main>
    </AppShell>
  );
}