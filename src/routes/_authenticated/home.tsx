import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlass, Wallet } from "@phosphor-icons/react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/afrixa/AppShell";
import { NotificationBell } from "@/components/afrixa/NotificationBell";
import { GigCard, OpportunityCard } from "@/components/afrixa/OpportunityCard";
import { OPPORTUNITY_STATS, initials, money, type Opportunity } from "@/lib/afrixa";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Your Afrixa feed — matched opportunities" },
      {
        name: "description",
        content:
          "See jobs, gigs and freelance projects matched to your skills, plus your escrow balance and profile strength.",
      },
      { property: "og:title", content: "Your Afrixa feed" },
      {
        property: "og:description",
        content: "Matched opportunities, escrow balance and profile progress in one place.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { profile, user } = useAuth();

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ["opportunities", "feed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Opportunity[];
    },
  });

  const { data: balance = 0 } = useQuery({
    queryKey: ["escrow-balance", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escrows")
        .select("amount,status")
        .in("status", ["funded", "in_progress", "delivered"]);
      if (error) throw error;
      return (data ?? []).reduce((total, row) => total + Number(row.amount), 0);
    },
  });

  const gigs = opportunities.filter((item) => item.category === "gig").slice(0, 4);
  const jobs = opportunities.filter((item) => item.category !== "gig");

  return (
    <AppShell>
      <div className="surface-hero px-4 pb-16 pt-8 text-primary-foreground">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-white/15 text-sm font-bold">
            {initials(profile?.full_name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-white/60">Welcome back</p>
            <p className="truncate text-base font-semibold">
              {profile?.full_name ?? "Afrixa member"}
            </p>
          </div>
          <Link
            to="/wallet"
            aria-label="Wallet"
            className="flex size-9 items-center justify-center rounded-full bg-white/15"
          >
            <Wallet size={18} />
          </Link>
          <NotificationBell />
        </div>

        <Link
          to="/explore"
          className="mt-6 flex h-12 items-center gap-2 rounded-xl bg-white/95 px-4 text-sm text-muted-foreground"
        >
          <MagnifyingGlass size={18} />
          Search jobs, gigs, talent…
        </Link>
      </div>

      <div className="-mt-10 space-y-6 px-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs text-muted-foreground">In escrow</p>
            <p className="mt-1 text-xl font-bold">{money(balance)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs text-muted-foreground">Profile strength</p>
            <p className="mt-1 text-xl font-bold text-secondary">
              {profile?.profile_strength ?? 0}%
            </p>
        </div>

        {profile?.role === "client" ? (
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/proposals"
              className="rounded-2xl border border-border bg-card p-4 shadow-card"
            >
              <p className="text-sm font-semibold">Proposals</p>
              <p className="mt-1 text-xs text-muted-foreground">Review, hire and fund escrow</p>
            </Link>
            <Link to="/gigs" className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <p className="text-sm font-semibold">Post a gig</p>
              <p className="mt-1 text-xs text-muted-foreground">Publish paid work for talent</p>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/applications"
              className="rounded-2xl border border-border bg-card p-4 shadow-card"
            >
              <p className="text-sm font-semibold">My applications</p>
              <p className="mt-1 text-xs text-muted-foreground">Status, hires and delivery</p>
            </Link>
            <Link to="/wallet" className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <p className="text-sm font-semibold">Escrow &amp; payouts</p>
              <p className="mt-1 text-xs text-muted-foreground">Track funds and releases</p>
            </Link>
          </div>
        )}

        <Link
          to="/contracts"
          className="block rounded-2xl border border-border bg-card p-4 shadow-card"
        >
          <p className="text-sm font-semibold">Contracts &amp; milestones</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {profile?.role === "client"
              ? "Fund each step and approve delivered work"
              : "Track funded milestones and submit your work"}
          </p>
        </Link>



        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {OPPORTUNITY_STATS.map((stat) => (
            <Link
              key={stat.key}
              to="/explore"
              search={{ category: stat.key }}
              className="shrink-0 rounded-2xl border border-border bg-card px-4 py-3 text-center shadow-card"
            >
              <p className="text-sm font-bold">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </Link>
          ))}
        </div>

        {gigs.length ? (
          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Popular gigs</h2>
              <Link to="/explore" search={{ category: "gig" }} className="text-xs font-medium text-secondary">
                See all
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {gigs.map((gig) => (
                <GigCard key={gig.id} opportunity={gig} />
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Matched for you</h2>
            <Link to="/explore" className="text-xs font-medium text-secondary">
              See all
            </Link>
          </div>
          <div className="mt-3 space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading opportunities…</p>
            ) : jobs.length ? (
              jobs.map((job) => <OpportunityCard key={job.id} opportunity={job} />)
            ) : (
              <p className="text-sm text-muted-foreground">
                No opportunities yet. Check back shortly.
              </p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
