import { Link } from "@tanstack/react-router";
import { MapPin, ShieldCheck, Star, Timer } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { budgetLabel, initials, timeLeft, type Opportunity } from "@/lib/afrixa";

export function EscrowBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary/12 px-2 py-0.5 text-[11px] font-semibold text-secondary">
      <ShieldCheck size={13} weight="fill" /> Escrow Funded
    </span>
  );
}

export function SkillChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
      {children}
    </span>
  );
}

export function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const left = timeLeft(opportunity.deadline);
  return (
    <Link
      to="/jobs/$id"
      params={{ id: opportunity.id }}
      className="block rounded-2xl border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-lift"
    >
      <div className="flex items-start gap-3">
        <span className="surface-hero flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-primary-foreground">
          {initials(opportunity.company)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-snug text-foreground">
            {opportunity.title}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {opportunity.company}
            {opportunity.work_mode ? ` • ${opportunity.work_mode}` : ""}
            {opportunity.job_type ? ` • ${opportunity.job_type}` : ""}
          </p>
        </div>
        <span className="text-sm font-semibold text-foreground">
          {budgetLabel(opportunity)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {opportunity.escrow_funded ? <EscrowBadge /> : null}
        {opportunity.skills.slice(0, 3).map((skill) => (
          <SkillChip key={skill}>{skill}</SkillChip>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin size={13} /> {opportunity.country ?? "Remote"}
        </span>
        {left ? (
          <span className="inline-flex items-center gap-1 font-medium text-gold-foreground">
            <Timer size={13} /> {left}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export function GigCard({ opportunity }: { opportunity: Opportunity }) {
  return (
    <Link
      to="/jobs/$id"
      params={{ id: opportunity.id }}
      className="block overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-lift"
    >
      <div className="surface-hero flex h-24 items-end p-3">
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
          {opportunity.category}
        </span>
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
          {opportunity.title}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{opportunity.company}</p>
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Star size={13} weight="fill" className="text-gold" />
            {opportunity.rating ?? "New"}
            {opportunity.reviews_count ? ` (${opportunity.reviews_count})` : ""}
          </span>
          {opportunity.delivery_days ? <span>{opportunity.delivery_days}d delivery</span> : null}
        </div>
        <p className="mt-2 text-sm font-semibold">{budgetLabel(opportunity)}</p>
      </div>
    </Link>
  );
}
