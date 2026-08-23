import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, Globe, ShieldCheck } from "@phosphor-icons/react";

import heroImg from "@/assets/hero-talent.png";
import { OPPORTUNITY_STATS } from "@/lib/afrixa";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Afrixa — Africa's Talent, Global Opportunities" },
      {
        name: "description",
        content:
          "Join Afrixa to find verified, escrow-funded jobs, gigs and freelance work across 54+ African countries and internationally.",
      },
      { property: "og:title", content: "Afrixa — Africa's Talent, Global Opportunities" },
      {
        property: "og:description",
        content:
          "Build your career, get paid securely and grow without borders with Afrixa.",
      },
    ],
  }),
  component: Intro,
});

const PILLARS = [
  { Icon: Briefcase, label: "Build your career" },
  { Icon: ShieldCheck, label: "Get paid securely" },
  { Icon: Globe, label: "Grow without borders" },
];

const WHY = [
  "Only African talent on the supply side",
  "International clients are buyers only",
  "Local payments in your currency",
  "Opportunities across 54+ countries",
  "Built by Africans, for Africa",
];

function Intro() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-background">
      <section className="surface-hero px-6 pb-10 pt-12 text-primary-foreground">
        <div className="flex items-center gap-2">
          <span className="surface-gold flex size-9 items-center justify-center rounded-xl text-sm font-bold text-gold-foreground">
            A
          </span>
          <span className="text-lg font-semibold tracking-tight">Afrixa</span>
        </div>

        <h1 className="mt-8 text-[32px] font-bold leading-[1.15]">
          Africa's Talent.
          <br />
          Global Opportunities.
        </h1>
        <p className="mt-3 text-sm text-white/75">
          Connect with verified opportunities across Africa and the world.
        </p>

        <ul className="mt-6 space-y-2.5">
          {PILLARS.map(({ Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-sm">
              <span className="flex size-9 items-center justify-center rounded-xl bg-white/10">
                <Icon size={18} weight="bold" />
              </span>
              {label}
            </li>
          ))}
        </ul>

        <img
          src={heroImg}
          alt="African freelancers collaborating on laptops"
          width={1024}
          height={768}
          className="mt-6 w-full"
        />

        <Link
          to="/auth"
          search={{ mode: "signup" }}
          className="surface-gold mt-6 flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold text-gold-foreground shadow-lift"
        >
          Get Started
        </Link>
        <p className="mt-3 text-center text-xs text-white/70">
          Already have an account?{" "}
          <Link to="/auth" search={{ mode: "signin" }} className="font-semibold text-gold underline">
            Sign In
          </Link>
        </p>
      </section>

      <section className="px-6 py-8">
        <h2 className="text-[22px] font-semibold">Active opportunities</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {OPPORTUNITY_STATS.map((stat) => (
            <div
              key={stat.key}
              className="rounded-2xl border border-border bg-card p-4 shadow-card"
            >
              <p className="text-xl font-bold text-secondary">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label} available</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-14">
        <h2 className="text-[22px] font-semibold">Why Afrixa?</h2>
        <ul className="mt-4 space-y-2.5">
          {WHY.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm text-muted-foreground">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold" />
              {item}
            </li>
          ))}
        </ul>
        <div className="surface-hero mt-8 rounded-3xl p-6 text-primary-foreground">
          <p className="text-xl font-semibold leading-snug">
            Your success story starts here.
          </p>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="mt-4 inline-flex h-11 items-center rounded-xl bg-white/15 px-5 text-sm font-semibold"
          >
            Explore Opportunities →
          </Link>
        </div>
      </section>
    </div>
  );
}
