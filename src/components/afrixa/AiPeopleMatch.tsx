import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SealCheck, Sparkle } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { initials } from "@/lib/afrixa";
import { recommendPeople } from "@/lib/people-match.functions";

export function AiPeopleMatch() {
  const [interests, setInterests] = useState("");
  const run = useServerFn(recommendPeople);
  const match = useMutation({ mutationFn: () => run({ data: { interests } }) });

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
      <div>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkle size={16} weight="fill" className="text-secondary" /> People to meet
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Describe your career interests and AI will suggest members worth connecting with.
        </p>
      </div>
      <Textarea
        value={interests}
        onChange={(e) => setInterests(e.target.value)}
        maxLength={1000}
        placeholder="e.g. I want to grow into product design for fintech startups in Lagos"
        className="min-h-20 rounded-xl"
      />
      <Button
        className="w-full"
        disabled={interests.trim().length < 5 || match.isPending}
        onClick={() => match.mutate()}
      >
        {match.isPending ? "Finding people…" : "Recommend people"}
      </Button>

      {match.error ? <p className="text-xs text-destructive">{match.error.message}</p> : null}
      {match.data && match.data.length === 0 ? (
        <p className="text-xs text-muted-foreground">No close matches yet — try describing your interests differently.</p>
      ) : null}

      <div className="space-y-2">
        {match.data?.map((p) => (
          <Link
            key={p.id}
            to="/talent/$id"
            params={{ id: p.id }}
            className="flex items-start gap-3 rounded-xl border border-border p-3"
          >
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-muted-foreground">
              {p.avatar_url ? <img src={p.avatar_url} alt="" className="size-full object-cover" /> : initials(p.full_name ?? "A")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-sm font-semibold">
                <span className="truncate">{p.full_name ?? "Afrixa member"}</span>
                {p.verified ? <SealCheck size={13} weight="fill" className="text-secondary" /> : null}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {p.headline ?? "Afrixa member"}
                {p.country ? ` · ${p.country}` : ""}
              </p>
              <p className="mt-1 text-xs leading-relaxed">{p.reason}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
