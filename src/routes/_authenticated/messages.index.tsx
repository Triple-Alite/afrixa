import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChatCircleText, MagnifyingGlass, Paperclip } from "@phosphor-icons/react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { initials } from "@/lib/afrixa";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/messages/")({
  head: () => ({
    meta: [
      { title: "Messages — Afrixa" },
      { name: "description", content: "Chat in real time with your Afrixa connections, clients and talent." },
      { property: "og:title", content: "Messages — Afrixa" },
      { property: "og:description", content: "Real-time chats with messages, photos and files on Afrixa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MessagesPage,
});

type Row = {
  id: string;
  subject: string | null;
  otherId: string;
  otherName: string;
  otherAvatar: string | null;
  otherHeadline: string | null;
  last_message_at: string;
  preview: string;
  unread: number;
};

function timeLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function MessagesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<Row[]> => {
      if (!user) return [];
      const { data: convs, error } = await supabase
        .from("conversations")
        .select("id,subject,participant_a,participant_b,last_message_at")
        .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      if (!convs?.length) return [];
      const otherIds = convs.map((c) => (c.participant_a === user.id ? c.participant_b : c.participant_a));
      const ids = convs.map((c) => c.id);
      const [{ data: profiles }, { data: msgs }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,avatar_url,headline").in("id", otherIds),
        supabase
          .from("messages")
          .select("conversation_id,body,sender_id,read_at,attachment_name,created_at")
          .in("conversation_id", ids)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      return convs.map((c) => {
        const otherId = c.participant_a === user.id ? c.participant_b : c.participant_a;
        const p = profiles?.find((x) => x.id === otherId);
        const mine = (msgs ?? []).filter((m) => m.conversation_id === c.id);
        const last = mine[0];
        const preview = last
          ? `${last.sender_id === user.id ? "You: " : ""}${last.body || (last.attachment_name ? `📎 ${last.attachment_name}` : "")}`
          : "Say hello 👋";
        return {
          id: c.id,
          subject: c.subject,
          otherId,
          otherName: p?.full_name || c.subject || "Afrixa member",
          otherAvatar: p?.avatar_url ?? null,
          otherHeadline: p?.headline ?? null,
          last_message_at: last?.created_at ?? c.last_message_at,
          preview,
          unread: mine.filter((m) => m.sender_id !== user.id && !m.read_at).length,
        };
      });
    },
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`inbox-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations", user.id] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  const filtered = rows.filter((r) => r.otherName.toLowerCase().includes(q.toLowerCase()));

  return (
    <AppShell>
      <ScreenHeader title="Messages" subtitle="Chat with your network in real time" />
      <main className="space-y-3 px-4">
        <div className="relative">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages" className="bg-card pl-9" />
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading conversations…</p>
        ) : filtered.length ? (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            {filtered.map((r) => (
              <Link
                key={r.id}
                to="/messages/$id"
                params={{ id: r.id }}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50"
              >
                {r.otherAvatar ? (
                  <img src={r.otherAvatar} alt={r.otherName} className="size-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="surface-hero flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-primary-foreground">
                    {initials(r.otherName)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className={cn("truncate text-sm", r.unread ? "font-bold" : "font-semibold")}>{r.otherName}</h2>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{timeLabel(r.last_message_at)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate text-xs", r.unread ? "font-medium text-foreground" : "text-muted-foreground")}>
                      {r.preview}
                    </p>
                    {r.unread > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-secondary px-1.5 text-[10px] font-bold text-secondary-foreground">
                        {r.unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <section className="rounded-2xl border border-dashed border-border p-8 text-center">
            <ChatCircleText size={32} className="mx-auto text-secondary" />
            <h2 className="mt-3 text-base font-semibold">No conversations yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Find people on the Network page and tap Message to start chatting.
            </p>
            <Link to="/feed" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-secondary">
              <Paperclip size={14} /> Go to Network
            </Link>
          </section>
        )}
      </main>
    </AppShell>
  );
}
