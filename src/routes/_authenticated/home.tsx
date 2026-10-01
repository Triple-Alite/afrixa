import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Buildings,
  ChatCircleDots,
  FileText,
  Lightning,
  MagnifyingGlass,
  ShieldCheck,
  UsersThree,
  Wallet,
} from "@phosphor-icons/react";
import { useEffect, useState, type ComponentType } from "react";

import logoImg from "@/assets/afrixa-logo.png";
import opportunityBanner from "@/assets/home-opportunity-banner.jpg";
import networkBanner from "@/assets/home-network-banner.jpg";
import walletBanner from "@/assets/home-wallet-banner.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/afrixa/AppShell";
import { NotificationBell } from "@/components/afrixa/NotificationBell";
import { OpportunityCard } from "@/components/afrixa/OpportunityCard";
import { initials, type Opportunity } from "@/lib/afrixa";
import { PostCard } from "@/components/afrixa/PostCard";
import { PostComposer } from "@/components/afrixa/PostComposer";
import { fetchFeed } from "@/lib/social.data";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Your Afrixa feed — matched opportunities" },
      {
        name: "description",
        content:
          "See jobs, gigs and freelance projects matched to your skills.",
      },
      { property: "og:title", content: "Your Afrixa feed" },
      {
        property: "og:description",
        content: "Matched opportunities and profile progress in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

type QuickLink = {
  label: string;
  to: "/explore" | "/applications" | "/talent" | "/assessment" | "/companies" | "/feed" | "/proposals" | "/gigs" | "/contracts" | "/wallet";
  Icon: ComponentType<{ size?: number; weight?: "regular" | "fill" | "bold" }>;
};

const TALENT_LINKS: QuickLink[] = [
  { label: "Jobs", to: "/explore", Icon: Briefcase },
  { label: "Gigs", to: "/explore", Icon: Lightning },
  { label: "Applications", to: "/applications", Icon: FileText },
  { label: "Learn", to: "/assessment", Icon: BookOpen },
  { label: "Companies", to: "/companies", Icon: Buildings },
  { label: "Network", to: "/feed", Icon: UsersThree },
];

const CLIENT_LINKS: QuickLink[] = [
  { label: "Post work", to: "/gigs", Icon: Lightning },
  { label: "Proposals", to: "/proposals", Icon: FileText },
  { label: "Find talent", to: "/talent", Icon: UsersThree },
  { label: "Contracts", to: "/contracts", Icon: Briefcase },
  { label: "Companies", to: "/companies", Icon: Buildings },
  { label: "Network", to: "/feed", Icon: ChatCircleDots },
];

const PROMOTIONS = [
  {
    eyebrow: "YOUR NEXT MOVE",
    title: "Opportunity is calling",
    copy: "Discover work that matches your talent and ambition.",
    action: "Explore now",
    to: "/explore" as const,
    image: opportunityBanner,
  },
  {
    eyebrow: "GROW TOGETHER",
    title: "Meet your network",
    copy: "Connect, share your progress and build meaningful relationships.",
    action: "Join the conversation",
    to: "/feed" as const,
    image: networkBanner,
  },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function HomePage() {
  const { profile, user } = useAuth();
  const [promotion, setPromotion] = useState(0);
  const isClient = profile?.role === "client";

  useEffect(() => {
    const timer = window.setInterval(
      () => setPromotion((current) => (current + 1) % PROMOTIONS.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, []);

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
  const { data: posts = [], isLoading: feedLoading } = useQuery({
    queryKey: ["feed", user?.id],
    queryFn: () => fetchFeed(user?.id),
  });


  const featured = opportunities.filter((item) => item.status === "open").slice(0, 5);
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? "there";
  const quickLinks = isClient ? CLIENT_LINKS : TALENT_LINKS;
  const activePromotion = PROMOTIONS[promotion] ?? PROMOTIONS[0];

  return (
    <AppShell className="bg-card">
      <header className="px-5 pb-3 pt-5">
        <div className="flex items-center justify-between gap-4">
          <img src={logoImg} alt="Afrixa" width={1020} height={539} className="h-14 w-auto object-contain" />
          <div className="flex items-center gap-2">
            <NotificationBell tone="light" />
            <Link
              to="/profile"
              aria-label="Open profile"
              className="flex size-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground ring-4 ring-muted"
            >
              {initials(profile?.full_name)}
            </Link>
          </div>
        </div>
        <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
          Connect. Discover. Work. Grow. Earn.
        </p>
      </header>

      <main className="space-y-8 px-5 pb-3">
        <section>
          <p className="text-sm font-semibold text-secondary">{greeting()},</p>
          <h1 className="text-2xl font-bold text-primary">{firstName} 👋</h1>

          {!isClient ? (
            <Link
              to="/explore"
              className="mt-4 flex h-12 items-center gap-3 rounded-2xl bg-muted px-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <MagnifyingGlass size={20} />
              Search jobs, gigs and opportunities…
            </Link>
          ) : null}

          <div className="relative mt-5 h-48 overflow-hidden rounded-3xl bg-primary shadow-lift">
            <img
              key={activePromotion.image}
              src={activePromotion.image}
              alt=""
              width={1408}
              height={704}
              className="absolute inset-0 size-full object-cover motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-transparent" />
            <div className="relative flex h-full max-w-[72%] flex-col items-start justify-center p-5 text-primary-foreground">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">
                {activePromotion.eyebrow}
              </p>
              <h2 className="mt-1 text-2xl font-bold leading-tight">{activePromotion.title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-primary-foreground/75">
                {activePromotion.copy}
              </p>
              <Link
                to={isClient && activePromotion.to === "/explore" ? "/talent" : activePromotion.to}
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-secondary px-4 text-xs font-bold text-secondary-foreground"
              >
                {isClient && activePromotion.to === "/explore" ? "Find talent" : activePromotion.action}
                <ArrowRight size={14} weight="bold" />
              </Link>
            </div>
            <div className="absolute bottom-3 right-4 flex gap-1.5">
              {PROMOTIONS.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  aria-label={`Show promotion ${index + 1}`}
                  onClick={() => setPromotion(index)}
                  className={`h-1.5 rounded-full transition-all ${index === promotion ? "w-5 bg-primary-foreground" : "w-1.5 bg-primary-foreground/40"}`}
                />
              ))}
            </div>
          </div>
        </section>

        <nav aria-label="Quick links" className="grid grid-cols-3 gap-x-3 gap-y-5">
          {quickLinks.map(({ label, to, Icon }) => (
            <Link key={label} to={to} className="group flex min-w-0 flex-col items-center gap-2 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl border border-border bg-muted text-primary shadow-card transition-transform group-hover:-translate-y-0.5">
                <Icon size={25} weight="bold" />
              </span>
              <span className="w-full text-xs font-semibold text-foreground">{label}</span>
            </Link>
          ))}
        </nav>

        {!isClient ? (
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-primary">Featured opportunities</h2>
              <Link to="/explore" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-secondary">
                See all <ArrowRight size={13} />
              </Link>
            </div>
            <div className="no-scrollbar -mx-5 mt-3 flex snap-x gap-3 overflow-x-auto px-5 pb-3">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading opportunities…</p>
              ) : featured.length ? (
                featured.map((item) => (
                  <div key={item.id} className="w-[82%] shrink-0 snap-start sm:w-[70%]">
                    <OpportunityCard opportunity={item} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">New opportunities are on the way.</p>
              )}
            </div>
          </section>
        ) : (
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-primary">Your hiring workspace</h2>
              <Link to="/proposals" className="inline-flex items-center gap-1 text-xs font-bold text-secondary">
                Open <ArrowRight size={13} />
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Link to="/proposals" className="rounded-2xl border border-border bg-muted p-4">
                <FileText size={22} className="text-secondary" />
                <p className="mt-3 text-sm font-bold">Review proposals</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Compare applicants and hire.</p>
              </Link>
              <Link to="/contracts" className="rounded-2xl border border-border bg-muted p-4">
                <ShieldCheck size={22} className="text-secondary" />
                <p className="mt-3 text-sm font-bold">Fund milestones</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Approve and release work.</p>
              </Link>
            </div>
          </section>
        )}

        <Link to="/wallet" className="relative block h-36 overflow-hidden rounded-3xl bg-primary shadow-card">
          <img
            src={walletBanner}
            alt="Secure Afrixa wallet and payments"
            loading="lazy"
            width={1408}
            height={704}
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-transparent" />
          <div className="relative flex h-full max-w-[70%] flex-col justify-center p-5 text-primary-foreground">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gold">
              <Wallet size={14} weight="fill" /> Secure payments
            </p>
            <h2 className="mt-1 text-xl font-bold">Afrixa Wallet &amp; Payments</h2>
            <p className="mt-1 text-xs text-primary-foreground/70">Fund. Earn. Receive. Withdraw.</p>
          </div>
        </Link>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary">From your network</h2>
            <Link to="/feed" className="inline-flex items-center gap-1 text-xs font-bold text-secondary">
              See all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="mt-3 space-y-3">
            <PostComposer />
            {feedLoading ? (
              <p className="text-sm text-muted-foreground">Loading posts…</p>
            ) : posts.length ? (
              posts.map((post) => <PostCard key={post.id} post={post} />)
            ) : (
              <p className="text-sm text-muted-foreground">
                No posts yet — share an update or connect with people to fill your feed.
              </p>
            )}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
