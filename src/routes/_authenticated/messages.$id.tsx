import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PaperPlaneRight, Paperclip, Image as ImageIcon, FileText, X, Checks, Check, DownloadSimple } from "@phosphor-icons/react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { initials } from "@/lib/afrixa";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
  read_at: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
};

const MAX = 20 * 1024 * 1024;

export const Route = createFileRoute("/_authenticated/messages/$id")({
  head: () => ({
    meta: [
      { title: "Chat — Afrixa" },
      { name: "description", content: "Real-time Afrixa chat with messages, photos and file sharing." },
      { property: "og:title", content: "Chat — Afrixa" },
      { property: "og:description", content: "Send messages, media and files instantly on Afrixa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ThreadPage,
});

function fmtSize(n: number | null) {
  if (!n) return "";
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`;
}

function Attachment({ m, mine }: { m: Msg; mine: boolean }) {
  const { data: url } = useQuery({
    queryKey: ["chat-file", m.attachment_path],
    enabled: Boolean(m.attachment_path),
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("chat-attachments").createSignedUrl(m.attachment_path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  if (!m.attachment_path) return null;
  const type = m.attachment_type ?? "";
  if (type.startsWith("image/"))
    return url ? (
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt={m.attachment_name ?? "Image"} className="max-h-64 w-full rounded-xl object-cover" />
      </a>
    ) : (
      <div className="h-40 w-56 animate-pulse rounded-xl bg-muted" />
    );
  if (type.startsWith("video/"))
    return url ? <video src={url} controls className="max-h-64 w-full rounded-xl" /> : null;
  if (type.startsWith("audio/")) return url ? <audio src={url} controls className="w-56" /> : null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "flex items-center gap-3 rounded-xl p-2.5",
        mine ? "bg-primary-foreground/10" : "bg-muted",
      )}
    >
      <FileText size={28} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold">{m.attachment_name}</span>
        <span className="block text-[10px] opacity-70">{fmtSize(m.attachment_size)}</span>
      </span>
      <DownloadSimple size={18} className="shrink-0" />
    </a>
  );
}

function ThreadPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);

  const { data: other } = useQuery({
    queryKey: ["conversation-other", id, user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) return null;
      const { data: c } = await supabase
        .from("conversations")
        .select("participant_a,participant_b,subject")
        .eq("id", id)
        .maybeSingle();
      if (!c) return null;
      const otherId = c.participant_a === user.id ? c.participant_b : c.participant_a;
      const { data: p } = await supabase
        .from("profiles")
        .select("id,full_name,avatar_url,headline")
        .eq("id", otherId)
        .maybeSingle();
      return { id: otherId, name: p?.full_name || c.subject || "Afrixa member", avatar: p?.avatar_url ?? null, headline: p?.headline ?? null };
    },
  });

  const key = ["messages", id];
  const { data: messages = [], isLoading } = useQuery({
    queryKey: key,
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id,body,sender_id,created_at,read_at,attachment_path,attachment_name,attachment_type,attachment_size")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
  });

  // Realtime: new messages, read receipts, typing, presence
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`chat-${id}`, { config: { presence: { key: user.id } } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          const m = payload.new as Msg;
          qc.setQueryData<Msg[]>(key, (old = []) => (old.some((x) => x.id === m.id) ? old : [...old, m]));
          if (m.sender_id !== user.id) setTyping(false);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          const m = payload.new as Msg;
          qc.setQueryData<Msg[]>(key, (old = []) => old.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
        },
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.user === user.id) return;
        setTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 3000);
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnline(Object.keys(state).some((k) => k !== user.id));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ at: Date.now() });
      });
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  // Mark incoming as read
  useEffect(() => {
    if (!user?.id) return;
    const unread = messages.filter((m) => m.sender_id !== user.id && !m.read_at).map((m) => m.id);
    if (unread.length) {
      supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unread).then(() => {});
    }
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, user?.id]);

  function onType(v: string) {
    setBody(v);
    const now = Date.now();
    if (channelRef.current && now - lastTypingSent.current > 1500) {
      lastTypingSent.current = now;
      channelRef.current.send({ type: "broadcast", event: "typing", payload: { user: user?.id } });
    }
  }

  function pick(f: File | undefined) {
    if (!f) return;
    if (f.size > MAX) return toast.error("Files must be 20MB or smaller");
    setFile(f);
  }

  async function send() {
    if (!user) return;
    const text = body.trim();
    if (!text && !file) return;
    setSending(true);
    try {
      let att: Partial<Msg> = {};
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
        const path = `${id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("chat-attachments").upload(path, file, {
          contentType: file.type || undefined,
        });
        if (upErr) throw upErr;
        att = { attachment_path: path, attachment_name: file.name, attachment_type: file.type || "application/octet-stream", attachment_size: file.size };
      }
      const { data, error } = await supabase
        .from("messages")
        .insert({ conversation_id: id, sender_id: user.id, body: text, ...att })
        .select("id,body,sender_id,created_at,read_at,attachment_path,attachment_name,attachment_type,attachment_size")
        .single();
      if (error) throw error;
      qc.setQueryData<Msg[]>(key, (old = []) => (old.some((x) => x.id === data.id) ? old : [...old, data as Msg]));
      setBody("");
      setFile(null);
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  let lastDay = "";

  return (
    <AppShell>
      <ScreenHeader title="Chat" back />
      <main className="flex min-h-[calc(100vh-10rem)] flex-col">
        {other && (
          <Link
            to="/talent/$id"
            params={{ id: other.id }}
            className="mx-4 mb-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card"
          >
            <span className="relative">
              {other.avatar ? (
                <img src={other.avatar} alt={other.name} className="size-11 rounded-full object-cover" />
              ) : (
                <span className="surface-hero flex size-11 items-center justify-center rounded-full text-xs font-bold text-primary-foreground">
                  {initials(other.name)}
                </span>
              )}
              {online && <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-card bg-secondary" />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{other.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {typing ? "typing…" : online ? "Active now" : other.headline ?? "Afrixa member"}
              </span>
            </span>
          </Link>
        )}

        <section className="flex-1 space-y-2 px-4 pb-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading messages…</p>
          ) : messages.length ? (
            messages.map((m) => {
              const mine = m.sender_id === user?.id;
              const day = new Date(m.created_at).toDateString();
              const showDay = day !== lastDay;
              lastDay = day;
              return (
                <div key={m.id}>
                  {showDay && (
                    <p className="my-3 text-center text-[11px] font-medium text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                  )}
                  <article
                    className={cn(
                      "max-w-[80%] space-y-1.5 rounded-2xl px-3.5 py-2.5 text-sm shadow-card",
                      mine
                        ? "ml-auto rounded-br-md bg-secondary text-secondary-foreground"
                        : "rounded-bl-md border border-border bg-card text-card-foreground",
                    )}
                  >
                    <Attachment m={m} mine={mine} />
                    {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                    <p className={cn("flex items-center justify-end gap-1 text-[10px]", mine ? "opacity-75" : "text-muted-foreground")}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {mine && (m.read_at ? <Checks size={12} weight="bold" aria-label="Seen" /> : <Check size={12} aria-label="Sent" />)}
                    </p>
                  </article>
                </div>
              );
            })
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No messages yet — say hello 👋
            </p>
          )}
          {typing && <p className="text-xs italic text-muted-foreground">{other?.name ?? "They"} is typing…</p>}
          <div ref={endRef} />
        </section>

        <section className="sticky bottom-20 space-y-2 border-t border-border bg-background px-4 pb-3 pt-2">
          {file && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 text-xs">
              {file.type.startsWith("image/") ? <ImageIcon size={18} /> : <FileText size={18} />}
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="text-muted-foreground">{fmtSize(file.size)}</span>
              <button onClick={() => setFile(null)} aria-label="Remove attachment">
                <X size={16} />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <button onClick={() => imgRef.current?.click()} aria-label="Add photo or video" className="p-2 text-muted-foreground hover:text-foreground">
              <ImageIcon size={22} />
            </button>
            <button onClick={() => fileRef.current?.click()} aria-label="Attach file" className="p-2 text-muted-foreground hover:text-foreground">
              <Paperclip size={22} />
            </button>
            <input ref={imgRef} type="file" accept="image/*,video/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
            <input ref={fileRef} type="file" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
            <textarea
              value={body}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Write a message…"
              rows={1}
              className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-input bg-card px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={send}
              disabled={sending || (!body.trim() && !file)}
              aria-label="Send"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground disabled:opacity-50"
            >
              <PaperPlaneRight size={18} weight="fill" />
            </button>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
