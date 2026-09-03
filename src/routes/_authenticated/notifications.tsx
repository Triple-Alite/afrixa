import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BellRinging,
  ChatCircleDots,
  CurrencyCircleDollar,
  FileText,
  ShieldCheck,
} from "@phosphor-icons/react";
import { useState } from "react";

import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
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

const FILTERS = [
  { id: "all", label: "All" },
  { id: "proposal", label: "Proposals" },
  { id: "escrow", label: "Escrow" },
  { id: "message", label: "Messages" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function matches(item: Notification, filter: FilterId) {
  if (filter === "all") return true;
  if (filter === "proposal") return item.type === "proposal" || item.type === "hired";
  if (filter === "escrow") return item.type === "escrow" || item.type === "payment";
  return item.type === "message";
}

function visuals(type: string) {
  if (type === "message") return { Icon: ChatCircleDots, tone: "bg-primary/10 text-primary" };
  if (type === "proposal" || type === "hired") return { Icon: FileText, tone: "bg-secondary/15 text-secondary" };
  if (type === "payment") return { Icon: CurrencyCircleDollar, tone: "bg-secondary/15 text-secondary" };
  if (type === "escrow") return { Icon: ShieldCheck, tone: "bg-primary/10 text-primary" };
  return { Icon: BellRinging, tone: "bg-muted text-muted-foreground" };
}

function NotificationsPage() {
  const { items, unread, isLoading, markAllRead, markRead } = useNotifications();
  const [filter, setFilter] = useState<FilterId>("all");

  const visible = items.filter((item) => matches(item, filter));

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

      <div className="flex gap-2 overflow-x-auto px-4 pb-3">
        {FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setFilter(option.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === option.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <main className="space-y-3 px-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading activity…</p>
        ) : visible.length ? (
          visible.map((item) => {
            const { Icon, tone } = visuals(item.type);
            const card = (
              <article
                className={`rounded-2xl border p-4 shadow-card ${
                  item.read_at ? "border-border bg-card" : "border-secondary/40 bg-secondary/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                    <Icon size={17} weight="bold" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-sm font-semibold">{item.title}</h2>
                      {item.read_at ? null : <span className="mt-1.5 size-2 shrink-0 rounded-full bg-secondary" />}
                    </div>
                    {item.body ? <p className="mt-1 text-xs text-muted-foreground">{item.body}</p> : null}
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </article>
            );

            return item.link ? (
              <Link
                key={item.id}
                to={item.link as never}
                className="block"
                onClick={() => {
                  if (!item.read_at) void markRead(item.id);
                }}
              >
                {card}
              </Link>
            ) : (
              <button
                key={item.id}
                type="button"
                className="block w-full text-left"
                onClick={() => {
                  if (!item.read_at) void markRead(item.id);
                }}
              >
                {card}
              </button>
            );
          })
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            {filter === "all"
              ? "No activity yet. Proposals, messages and escrow updates will show up here."
              : "Nothing in this category yet."}
          </p>
        )}
      </main>
    </AppShell>
  );
}
