export type PostKind = "update" | "article" | "job" | "portfolio" | "announcement" | "position";
export type PostVisibility = "public" | "connections";
export type ReactionKind = "like" | "celebrate" | "insightful" | "support" | "curious";

export type PostAuthor = {
  id: string;
  full_name: string;
  headline: string | null;
  avatar_url: string | null;
  primary_skill: string | null;
  verified: boolean;
  role: "talent" | "client" | null;
};

export type Post = {
  id: string;
  author_id: string;
  body: string;
  image_url: string | null;
  link_url: string | null;
  kind: string;
  visibility: string;
  comment_count: number;
  reaction_count: number;
  created_at: string;
};

export type FeedPost = Post & {
  author: PostAuthor | null;
  myReaction: ReactionKind | null;
};

export type PostComment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  parent_id: string | null;
  author: PostAuthor | null;
};

export type Connection = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined";
  message: string | null;
  created_at: string;
};

export const POST_KINDS: { value: PostKind; label: string }[] = [
  { value: "update", label: "Update" },
  { value: "portfolio", label: "Work sample" },
  { value: "job", label: "Hiring" },
  { value: "article", label: "Article" },
  { value: "announcement", label: "Milestone" },
];

export const POST_KIND_LABEL: Record<string, string> = {
  update: "Update",
  portfolio: "Work sample",
  job: "Hiring",
  article: "Article",
  announcement: "Milestone",
  position: "New position",
};

export const REACTIONS: { value: ReactionKind; label: string; emoji: string }[] = [
  { value: "like", label: "Like", emoji: "👍" },
  { value: "celebrate", label: "Celebrate", emoji: "🎉" },
  { value: "insightful", label: "Insightful", emoji: "💡" },
  { value: "support", label: "Support", emoji: "🤝" },
  { value: "curious", label: "Curious", emoji: "🤔" },
];

export function reactionMeta(value: string | null | undefined) {
  return REACTIONS.find((r) => r.value === value) ?? REACTIONS[0]!;
}

export function timeAgo(iso: string) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  const steps: [number, string][] = [
    [60, "s"],
    [3600, "m"],
    [86400, "h"],
    [604800, "d"],
    [2592000, "w"],
  ];
  if (seconds < 60) return `${seconds}s`;
  for (let i = 1; i < steps.length; i += 1) {
    const [limit, unit] = steps[i]!;
    if (seconds < limit) return `${Math.floor(seconds / steps[i - 1]![0])}${unit}`;
  }
  return `${Math.floor(seconds / 2592000)}mo`;
}
