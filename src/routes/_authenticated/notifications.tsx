import { createFileRoute, Link } from "@tanstack/react-router";
import { BellRinging } from "@phosphor-icons/react";

import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Afrixa" },
      {
        name: "description",
        content: "Proposal, message and escrow updates across your Afrixa work in one activity feed.",
      },
      { property: "og:title", content: "Notifications — Afrixa" },
      { property: "og:description", content: "Stay on top of Afrixa hiring, messages and escrow events." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { items, unread, isLoading, markAllRead } = useNotifications();

  return (
    <AppShell>
      <ScreenHeader
        title="Notifications"
        subtitle={unread ? `${unread} unread` : "All caught up"}
        back
        action={
          unread ? (
            <Button variant="ghost" size="sm" onClick={() => void markAllRead()}>
              Mark read
            </Button>
          ) : null
        }
      />
      <main className="space-y-3 px-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading activity…</p>
        ) : items.length ? (
          items.map((item) => {
            const card = (
              <article
                className={`rounded-2xl border p-4 shadow-card ${
                  item.read_at ? "border-border bg-card" : "border-secondary/40 bg-secondary/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                    <BellRinging size={17} weight="bold" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold">{item.title}</h2>
                    {item.body ? <p className="mt-1 text-xs text-muted-foreground">{item.body}</p> : null}
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </article>
            );
            return item.link ? (
              <Link key={item.id} to={item.link as never} className="block">
                {card}
              </Link>

            ) : (
              <div key={item.id}>{card}</div>
            );
          })
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No activity yet. Proposals, messages and escrow updates will show up here.
          </p>
        )}
      </main>
    </AppShell>
  );
}
