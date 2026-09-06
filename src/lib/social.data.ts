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

export type PersonSuggestion = PostAuthor & {
  country: string | null;
  connection: "none" | "pending" | "connected";
  following: boolean;
};

export async function fetchPeople(userId: string, term: string): Promise<PersonSuggestion[]> {
  let query = supabase
    .from("profiles")
    .select(`${AUTHOR_COLUMNS},country`)
    .neq("id", userId)
    .limit(40);
  if (term.trim()) {
    const like = `%${term.trim()}%`;
    query = query.or(`full_name.ilike.${like},headline.ilike.${like},primary_skill.ilike.${like}`);
  }
  const { data, error } = await query;
  if (error) throw error;
  const people = (data ?? []) as (PostAuthor & { country: string | null })[];
  if (people.length === 0) return [];

  const [{ data: conns }, { data: follows }] = await Promise.all([
    supabase.from("connections").select("requester_id,addressee_id,status"),
    supabase.from("follows").select("following_id").eq("follower_id", userId),
  ]);

  const connState = new Map<string, "pending" | "connected">();
  for (const row of conns ?? []) {
    const other = row.requester_id === userId ? row.addressee_id : row.requester_id;
    if (row.requester_id !== userId && row.addressee_id !== userId) continue;
    if (row.status === "accepted") connState.set(other, "connected");
    else if (row.status === "pending" && !connState.has(other)) connState.set(other, "pending");
  }
  const followSet = new Set((follows ?? []).map((row) => row.following_id));

  return people.map((person) => ({
    ...person,
    connection: connState.get(person.id) ?? "none",
    following: followSet.has(person.id),
  }));
}

export async function toggleFollow(userId: string, targetId: string, following: boolean) {
  if (following) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", userId)
      .eq("following_id", targetId);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: userId, following_id: targetId });
  if (error) throw error;
  return true;
}

export async function openDirectConversation(userId: string, otherId: string): Promise<string> {
  const { data: existing, error } = await supabase
    .from("conversations")
    .select("id,participant_a,participant_b")
    .or(
      `and(participant_a.eq.${userId},participant_b.eq.${otherId}),and(participant_a.eq.${otherId},participant_b.eq.${userId})`,
    )
    .limit(1);
  if (error) throw error;
  const found = existing?.[0];
  if (found) return found.id;
  const { data: created, error: insertError } = await supabase
    .from("conversations")
    .insert({ participant_a: userId, participant_b: otherId })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return created.id;
}
