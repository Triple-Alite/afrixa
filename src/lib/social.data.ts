import { supabase } from "@/integrations/supabase/client";

import type {
  Connection,
  FeedPost,
  Post,
  PostAuthor,
  PostComment,
  ReactionKind,
} from "@/lib/social";

const AUTHOR_COLUMNS = "id,full_name,headline,avatar_url,primary_skill,verified,role";

async function fetchAuthors(ids: string[]): Promise<Map<string, PostAuthor>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase
    .from("profiles")
    .select(AUTHOR_COLUMNS)
    .in("id", unique);
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.id, row as PostAuthor]));
}

export async function fetchFeed(userId: string | undefined, authorId?: string): Promise<FeedPost[]> {
  let query = supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(40);
  if (authorId) query = query.eq("author_id", authorId);
  const { data, error } = await query;
  if (error) throw error;

  const posts = (data ?? []) as Post[];
  if (posts.length === 0) return [];

  const authors = await fetchAuthors(posts.map((p) => p.author_id));

  let mine = new Map<string, ReactionKind>();
  if (userId) {
    const { data: reactions } = await supabase
      .from("post_reactions")
      .select("post_id,reaction")
      .eq("user_id", userId)
      .in(
        "post_id",
        posts.map((p) => p.id),
      );
    mine = new Map(
      (reactions ?? []).map((row) => [row.post_id, row.reaction as ReactionKind]),
    );
  }

  return posts.map((post) => ({
    ...post,
    author: authors.get(post.author_id) ?? null,
    myReaction: mine.get(post.id) ?? null,
  }));
}

export async function fetchComments(postId: string): Promise<PostComment[]> {
  const { data, error } = await supabase
    .from("post_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as Omit<PostComment, "author">[];
  const authors = await fetchAuthors(rows.map((row) => row.author_id));
  return rows.map((row) => ({ ...row, author: authors.get(row.author_id) ?? null }));
}

export async function setReaction(
  postId: string,
  userId: string,
  reaction: ReactionKind,
  current: ReactionKind | null,
) {
  if (current === reaction) {
    const { error } = await supabase
      .from("post_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    if (error) throw error;
    return null;
  }
  if (current) {
    const { error } = await supabase
      .from("post_reactions")
      .update({ reaction })
      .eq("post_id", postId)
      .eq("user_id", userId);
    if (error) throw error;
    return reaction;
  }
  const { error } = await supabase
    .from("post_reactions")
    .insert({ post_id: postId, user_id: userId, reaction });
  if (error) throw error;
  return reaction;
}

export type NetworkData = {
  incoming: (Connection & { person: PostAuthor | null })[];
  outgoing: (Connection & { person: PostAuthor | null })[];
  connected: (Connection & { person: PostAuthor | null })[];
};

export async function fetchNetwork(userId: string): Promise<NetworkData> {
  const { data, error } = await supabase
    .from("connections")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Connection[];

  const otherId = (row: Connection) =>
    row.requester_id === userId ? row.addressee_id : row.requester_id;
  const authors = await fetchAuthors(rows.map(otherId));
  const withPerson = rows.map((row) => ({ ...row, person: authors.get(otherId(row)) ?? null }));

  return {
    incoming: withPerson.filter((r) => r.status === "pending" && r.addressee_id === userId),
    outgoing: withPerson.filter((r) => r.status === "pending" && r.requester_id === userId),
    connected: withPerson.filter((r) => r.status === "accepted"),
  };
}

export async function requestConnection(requesterId: string, addresseeId: string, message?: string) {
  const { error } = await supabase.from("connections").insert({
    requester_id: requesterId,
    addressee_id: addresseeId,
    ...(message ? { message } : {}),
  });
  if (error) throw error;
}

export async function respondToConnection(id: string, status: "accepted" | "declined") {
  const { error } = await supabase.from("connections").update({ status }).eq("id", id);
  if (error) throw error;
}
