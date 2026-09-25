import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChatCircleText } from "@phosphor-icons/react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { initials } from "@/lib/afrixa";

type Conversation = {
  id: string;
  subject: string | null;
  participant_a: string;
  participant_b: string;
  last_message_at: string;
};

export const Route = createFileRoute("/_authenticated/messages/")({
  head: () => ({
    meta: [
      { title: "Messages — Afrixa" },
      {
        name: "description",
        content: "Manage Afrixa conversations with clients and talent after proposals, hiring and delivery.",
      },
      { property: "og:title", content: "Messages — Afrixa" },
      {
        property: "og:description",
        content: "Secure conversations for Afrixa jobs, gigs and escrow milestones.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const { user } = useAuth();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("conversations")
        .select("id,subject,participant_a,participant_b,last_message_at")
        .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AppShell>
      <ScreenHeader title="Messages" subtitle="Conversations tied to real work" />
      <main className="space-y-3 px-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading conversations…</p>
        ) : conversations.length ? (
          conversations.map((conversation: Conversation) => (
            <Link
              key={conversation.id}
              to="/messages/$id"
              params={{ id: conversation.id }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card"
            >
              <span className="surface-hero flex size-11 shrink-0 items-center justify-center rounded-full text-xs font-bold text-primary-foreground">
                {initials(conversation.subject)}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold">
                  {conversation.subject ?? "Afrixa conversation"}
                </h2>
                <p className="truncate text-xs text-muted-foreground">
                  Last active {new Date(conversation.last_message_at).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))
        ) : (
          <section className="rounded-2xl border border-dashed border-border p-8 text-center">
            <ChatCircleText size={32} className="mx-auto text-secondary" />
            <h2 className="mt-3 text-base font-semibold">No conversations yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Start from an opportunity detail page when you're ready to speak with a client.
            </p>
          </section>
        )}
      </main>
    </AppShell>
  );
}