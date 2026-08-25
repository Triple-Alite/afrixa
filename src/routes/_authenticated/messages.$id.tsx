import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PaperPlaneTilt } from "@phosphor-icons/react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/messages/$id")({
  head: () => ({
    meta: [
      { title: "Conversation — Afrixa" },
      {
        name: "description",
        content: "Read and reply to Afrixa work conversations connected to proposals and escrow milestones.",
      },
      { property: "og:title", content: "Conversation — Afrixa" },
      {
        property: "og:description",
        content: "A secure Afrixa message thread for client and talent collaboration.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MessageThreadPage,
});

function MessageThreadPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");

  const { data: conversation } = useQuery({
    queryKey: ["conversation", id, user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("conversations")
        .select("id,subject,participant_a,participant_b")
        .eq("id", id)
        .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", id, user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("messages")
        .select("id,body,sender_id,created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const cleanBody = body.trim();
      if (!cleanBody) throw new Error("Write a message first");
      const { error } = await supabase.from("messages").insert({
        conversation_id: id,
        sender_id: user.id,
        body: cleanBody,
      });
      if (error) throw error;
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", id);
    },
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["messages", id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not send"),
  });

  return (
    <AppShell>
      <ScreenHeader title={conversation?.subject ?? "Conversation"} subtitle="Protected workspace" back />
      <main className="flex min-h-[calc(100vh-10rem)] flex-col px-4">
        <section className="flex-1 space-y-3 pb-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading messages…</p>
          ) : messages.length ? (
            messages.map((message: ChatMessage) => {
              const mine = message.sender_id === user?.id;
              return (
                <article
                  key={message.id}
                  className={cn(
                    "max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-card",
                    mine
                      ? "ml-auto bg-secondary text-secondary-foreground"
                      : "border border-border bg-card text-card-foreground",
                  )}
                >
                  <p>{message.body}</p>
                  <p className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </article>
              );
            })
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No messages yet.
            </p>
          )}
        </section>

        <section className="sticky bottom-20 space-y-2 bg-background pb-3 pt-2">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write a message"
            rows={3}
            className="bg-card"
          />
          <Button className="h-11 w-full" disabled={send.isPending} onClick={() => send.mutate()}>
            <PaperPlaneTilt size={16} weight="bold" />
            {send.isPending ? "Sending…" : "Send message"}
          </Button>
        </section>
      </main>
    </AppShell>
  );
}