import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, ChatCircle, SealCheck, ShareNetwork, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { initials } from "@/lib/afrixa";
import { fetchComments, setReaction } from "@/lib/social.data";
import {
  POST_KIND_LABEL,
  REACTIONS,
  reactionMeta,
  timeAgo,
  type FeedPost,
  type PostComment,
  type ReactionKind,
} from "@/lib/social";
import { cn } from "@/lib/utils";

export function PostCard({ post }: { post: FeedPost }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const [replyDraft, setReplyDraft] = useState("");

  const mine = user?.id === post.author_id;

  const react = useMutation({
    mutationFn: async (reaction: ReactionKind) => {
      if (!user) throw new Error("Sign in to react");
      await setReaction(post.id, user.id, reaction, post.myReaction);
    },
    onSuccess: () => {
      setShowReactions(false);
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["post-comments", post.id],
    enabled: showComments,
    queryFn: () => fetchComments(post.id),
  });

  const comment = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to comment");
      const { error } = await supabase
        .from("post_comments")
        .insert({ post_id: post.id, author_id: user.id, body: draft.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["post-comments", post.id] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reply = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to reply");
      if (!replyTo) throw new Error("Pick a comment to reply to");
      const { error } = await supabase.from("post_comments").insert({
        post_id: post.id,
        author_id: user.id,
        body: replyDraft.trim(),
        parent_id: replyTo.parent_id ?? replyTo.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReplyDraft("");
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["post-comments", post.id] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("posts").delete().eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Post deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const author = post.author;

  return (
    <article className="rounded-2xl border border-border bg-card shadow-sm">
      <header className="flex items-start gap-3 p-4 pb-3">
        <Link
          to="/talent/$id"
          params={{ id: post.author_id }}
          aria-label="View profile"
          className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold text-muted-foreground"
        >
          {author?.avatar_url ? (
            <img src={author.avatar_url} alt="" className="size-full object-cover" />
          ) : (
            initials(author?.full_name ?? "Afrixa member")
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-sm font-semibold">
            <Link to="/talent/$id" params={{ id: post.author_id }} className="truncate hover:underline">
              {author?.full_name ?? "Afrixa member"}
            </Link>
            {author?.verified ? <SealCheck size={14} className="text-secondary" weight="fill" /> : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {author?.headline ?? author?.primary_skill ?? "Afrixa community"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {timeAgo(post.created_at)} · {POST_KIND_LABEL[post.kind] ?? "Update"}
            {post.visibility === "connections" ? " · Connections" : ""}
          </p>
        </div>
        {mine ? (
          <button
            type="button"
            aria-label="Delete post"
            onClick={() => remove.mutate()}
            className="text-muted-foreground"
          >
            <Trash size={16} />
          </button>
        ) : null}
      </header>

      {post.kind === "position" ? (
        <div className="surface-hero mx-4 mb-3 flex items-center gap-3 rounded-xl p-4 text-primary-foreground">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
            <Briefcase size={22} weight="fill" />
          </span>
          <span>
            <span className="block text-xs uppercase tracking-wide opacity-80">New position</span>
            <span className="block text-sm font-semibold">Congratulate {author?.full_name?.split(" ")[0] ?? "them"} 🎉</span>
          </span>
        </div>
      ) : null}

      {post.body ? (
        <p className="whitespace-pre-wrap px-4 pb-3 text-sm leading-relaxed">{post.body}</p>
      ) : null}

      {post.image_url ? (
        <img src={post.image_url} alt="" className="max-h-80 w-full object-cover" />
      ) : null}

      {post.link_url ? (
        <a
          href={post.link_url}
          target="_blank"
          rel="noreferrer noopener"
          className="mx-4 mb-3 mt-3 flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-primary"
        >
          <ShareNetwork size={14} />
          <span className="truncate">{post.link_url}</span>
        </a>
      ) : null}

      <div className="flex items-center justify-between px-4 py-2 text-[11px] text-muted-foreground">
        <span>
          {post.reaction_count} reaction{post.reaction_count === 1 ? "" : "s"}
        </span>
        <span>
          {post.comment_count} comment{post.comment_count === 1 ? "" : "s"}
        </span>
      </div>

      <div className="relative flex items-stretch border-t border-border">
        <button
          type="button"
          onClick={() => setShowReactions((prev) => !prev)}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-semibold",
            post.myReaction ? "text-primary" : "text-muted-foreground",
          )}
        >
          <span>{reactionMeta(post.myReaction).emoji}</span>
          {post.myReaction ? reactionMeta(post.myReaction).label : "React"}
        </button>
        <button
          type="button"
          onClick={() => setShowComments((prev) => !prev)}
          className="flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-semibold text-muted-foreground"
        >
          <ChatCircle size={16} />
          Comment
        </button>

        {showReactions ? (
          <div className="absolute -top-11 left-2 z-10 flex gap-1 rounded-full border border-border bg-card p-1.5 shadow-lift">
            {REACTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-label={item.label}
                onClick={() => react.mutate(item.value)}
                className="text-lg leading-none transition-transform hover:scale-125"
              >
                {item.emoji}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {showComments ? (
        <div className="space-y-3 border-t border-border p-4">
          {comments
            .filter((item) => !item.parent_id)
            .map((item) => (
              <div key={item.id} className="space-y-2">
                <CommentRow
                  item={item}
                  onReply={() => {
                    setReplyTo(item);
                    setReplyDraft("");
                  }}
                />
                {comments
                  .filter((child) => child.parent_id === item.id)
                  .map((child) => (
                    <div key={child.id} className="ml-10">
                      <CommentRow
                        item={child}
                        onReply={() => {
                          setReplyTo(child);
                          setReplyDraft("");
                        }}
                      />
                    </div>
                  ))}
                {replyTo && (replyTo.id === item.id || replyTo.parent_id === item.id) ? (
                  <div className="ml-10 space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Replying to {replyTo.author?.full_name ?? "comment"} ·{" "}
                      <button
                        type="button"
                        className="font-semibold text-primary"
                        onClick={() => setReplyTo(null)}
                      >
                        Cancel
                      </button>
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        value={replyDraft}
                        onChange={(event) => setReplyDraft(event.target.value)}
                        placeholder="Write a reply…"
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && replyDraft.trim()) reply.mutate();
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={!replyDraft.trim() || reply.isPending}
                        onClick={() => reply.mutate()}
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          {comments.length === 0 ? (
            <p className="text-xs text-muted-foreground">Be the first to comment.</p>
          ) : null}
          <div className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a comment…"
              onKeyDown={(event) => {
                if (event.key === "Enter" && draft.trim()) comment.mutate();
              }}
            />
            <Button
              type="button"
              size="sm"
              disabled={!draft.trim() || comment.isPending}
              onClick={() => comment.mutate()}
            >
              Send
            </Button>
          </div>
          {author && !mine ? (
            <Link
              to="/talent/$id"
              params={{ id: post.author_id }}
              className="block text-xs font-semibold text-primary"
            >
              View {author.full_name.split(" ")[0]}'s profile
            </Link>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function CommentRow({ item, onReply }: { item: PostComment; onReply: () => void }) {
  return (
    <div className="flex items-start gap-2">
      <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
        {item.author?.avatar_url ? (
          <img src={item.author.avatar_url} alt="" className="size-full object-cover" />
        ) : (
          initials(item.author?.full_name ?? "A")
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-muted/60 px-3 py-2">
          <p className="text-xs font-semibold">
            <Link to="/talent/$id" params={{ id: item.author_id }} className="hover:underline">
              {item.author?.full_name ?? "Afrixa member"}
            </Link>
            <span className="ml-1 font-normal text-muted-foreground">
              · {timeAgo(item.created_at)}
            </span>
          </p>
          <p className="text-sm">{item.body}</p>
        </div>
        <button
          type="button"
          className="ml-3 mt-0.5 text-xs font-semibold text-muted-foreground hover:text-primary"
          onClick={onReply}
        >
          Reply
        </button>
      </div>
    </div>
  );
}
