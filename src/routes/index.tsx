import { createFileRoute, Link } from "@tanstack/react-router";

import wordmarkImg from "@/assets/afrixa-wordmark.png";
import globeImg from "@/assets/afrixa-globe.png";
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
      <section className="pt-12">
        <div className="px-6 text-center">
          <img
            src={wordmarkImg}
            alt="Afrixa"
            width={430}
            height={141}
            className="mx-auto h-16 w-auto"
          />
          <p className="mt-1 text-[11px] font-semibold tracking-[0.25em] text-muted-foreground">
            CONNECT · EMPOWER · GROW
          </p>

          <h1 className="mt-9 text-[32px] font-bold leading-[1.15] text-primary">
            Your Future
            <br />
            Starts Here.
          </h1>
          <p className="mx-auto mt-3 max-w-[17rem] text-sm leading-relaxed text-muted-foreground">
            The Pan-African platform that connects your skills to real
            opportunities.
          </p>

          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="mt-9 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-lift transition-colors hover:bg-primary/90"
          >
            Get Started
          </Link>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/auth" search={{ mode: "signin" }} className="font-semibold text-gold underline">
              Log in
            </Link>
          </p>
        </div>

        <img
          src={globeImg}
          alt="A globe with golden pins marking opportunities across Africa and the world"
          width={768}
          height={276}
          className="mt-8 w-full"
        />
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
