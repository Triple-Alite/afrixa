import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChatCircleDots, SealCheck } from "@phosphor-icons/react";
import { toast } from "sonner";

import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { initials } from "@/lib/afrixa";
import { fetchNetwork, respondToConnection } from "@/lib/social.data";
import { fetchSkillsForPeople } from "@/lib/profile.data";
import type { PostAuthor } from "@/lib/social";

export const Route = createFileRoute("/_authenticated/network")({
  head: () => ({
    meta: [
      { title: "Your Afrixa network — connections and requests" },
      {
        name: "description",
        content:
          "Accept connection requests, review pending invites and message the people in your Afrixa network.",
      },
      { property: "og:title", content: "Your Afrixa network" },
      {
        property: "og:description",
        content: "Manage connection requests and message the people you work with.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NetworkPage,
});

function PersonRow({
  person,
  fallbackId,
  skills,
  children,
}: {
  person: PostAuthor | null;
  fallbackId: string;
  skills?: string[];
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
      <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold text-muted-foreground">
        {person?.avatar_url ? (
          <img src={person.avatar_url} alt="" className="size-full object-cover" />
        ) : (
          initials(person?.full_name ?? "A")
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-sm font-semibold">
          <span className="truncate">{person?.full_name ?? "Afrixa member"}</span>
          {person?.verified ? <SealCheck size={14} weight="fill" className="text-secondary" /> : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {person?.headline ?? person?.primary_skill ?? "Afrixa community"}
        </p>
        {skills && skills.length > 0 ? (
          <ul className="mt-1 flex flex-wrap gap-1">
            {skills.map((skill) => (
              <li
                key={skill}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {skill}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">{children ?? null}</div>
      <span className="hidden">{fallbackId}</span>
    </div>
  );
}

function RecommendedGigs({ userId }: { userId: string }) {
  const { data: signals } = useQuery({
    queryKey: ["talent-signals", userId],
    queryFn: () => fetchTalentSignals(userId),
  });
  const { data: gigs } = useQuery({ queryKey: ["open-gigs"], queryFn: () => fetchOpenGigs() });

  const ranked = signals && gigs ? rankGigs(gigs, signals).slice(0, 4) : [];
  const hasSignals =
    signals &&
    (signals.skills.length > 0 ||
      signals.experienceText.length > 0 ||
      signals.portfolioCategories.length > 0 ||
      signals.primarySkill);

  if (!hasSignals) {
    return (
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Recommended gigs for me</h2>
        <div className="rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="text-sm font-semibold">Tell us what you do</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add your skills, experience and portfolio and we will match gigs to you.
          </p>
          <Link to="/profile" className="mt-3 inline-block text-xs font-semibold text-primary">
            Complete my profile
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Recommended gigs for me</h2>
        <Link to="/explore" className="text-xs font-semibold text-primary">
          See all
        </Link>
      </div>
      {ranked.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          No close matches right now — check back soon.
        </p>
      ) : (
        ranked.map((item) => (
          <div key={item.opportunity.id} className="space-y-1.5">
            <OpportunityCard opportunity={item.opportunity} />
            <p className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
              <span className="rounded-full bg-secondary/12 px-2 py-0.5 font-semibold text-secondary">
                {matchPercent(item.score)}% match
              </span>
              <span className="truncate">{item.reasons.slice(0, 2).join(" • ")}</span>
            </p>
          </div>
        ))
      )}
    </section>
  );
}

function NetworkPage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["network", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => fetchNetwork(user!.id),
  });

  const respond = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "accepted" | "declined" }) =>
      respondToConnection(id, status),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["network"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast.success(variables.status === "accepted" ? "Connected" : "Request declined");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const peopleIds = [
    ...new Set(
      [...(data?.incoming ?? []), ...(data?.outgoing ?? []), ...(data?.connected ?? [])].map((row) =>
        row.requester_id === user?.id ? row.addressee_id : row.requester_id,
      ),
    ),
  ];

  const { data: skillMap } = useQuery({
    queryKey: ["network-skills", peopleIds],
    enabled: peopleIds.length > 0,
    queryFn: () => fetchSkillsForPeople(peopleIds),
  });

  const incoming = data?.incoming ?? [];

  const outgoing = data?.outgoing ?? [];
  const connected = data?.connected ?? [];

  return (
    <AppShell>
      <ScreenHeader title="My network" subtitle={`${connected.length} connections`} back />

      <div className="space-y-6 px-4 pb-6">
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading your network…</p>
        ) : null}

        {incoming.length > 0 ? (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Invitations ({incoming.length})</h2>
            {incoming.map((row) => (
              <PersonRow
                key={row.id}
                person={row.person}
                fallbackId={row.requester_id}
                skills={skillMap?.get(row.requester_id) ?? []}
              >
                <Button
                  size="sm"
                  variant="outline"
                  disabled={respond.isPending}
                  onClick={() => respond.mutate({ id: row.id, status: "declined" })}
                >
                  Ignore
                </Button>
                <Button
                  size="sm"
                  disabled={respond.isPending}
                  onClick={() => respond.mutate({ id: row.id, status: "accepted" })}
                >
                  Accept
                </Button>
              </PersonRow>
            ))}
          </section>
        ) : null}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Connections</h2>
          {connected.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center">
              <p className="text-sm font-semibold">No connections yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Find people in Explore or the community feed and send an invite.
              </p>
              <Link
                to="/talent"
                className="mt-3 inline-block text-xs font-semibold text-primary"
              >
                Browse talent
              </Link>
            </div>
          ) : (
            connected.map((row) => {
              const otherId = row.requester_id === user?.id ? row.addressee_id : row.requester_id;
              return (
                <PersonRow
                  key={row.id}
                  person={row.person}
                  fallbackId={otherId}
                  skills={skillMap?.get(otherId) ?? []}
                >
                  <Link
                    to="/messages"
                    aria-label="Message"
                    className="flex size-9 items-center justify-center rounded-full border border-border"
                  >
                    <ChatCircleDots size={16} />
                  </Link>
                  <Link
                    to="/talent/$id"
                    params={{ id: otherId }}
                    className="text-xs font-semibold text-primary"
                  >
                    View
                  </Link>
                </PersonRow>
              );
            })
          )}
        </section>

        {outgoing.length > 0 ? (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Sent invites</h2>
            {outgoing.map((row) => (
              <PersonRow
                key={row.id}
                person={row.person}
                fallbackId={row.addressee_id}
                skills={skillMap?.get(row.addressee_id) ?? []}
              >
                <span className="text-xs text-muted-foreground">Pending</span>
              </PersonRow>
            ))}
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
