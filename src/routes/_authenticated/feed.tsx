import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { UsersThree } from "@phosphor-icons/react";

import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { NotificationBell } from "@/components/afrixa/NotificationBell";
import { PostCard } from "@/components/afrixa/PostCard";
import { PostComposer } from "@/components/afrixa/PostComposer";
import { useAuth } from "@/hooks/useAuth";
import { fetchFeed } from "@/lib/social.data";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Afrixa community feed — share your work" },
      {
        name: "description",
        content:
          "Post updates, work samples and hiring news, react and comment with other African talent and clients on Afrixa.",
      },
      { property: "og:title", content: "Afrixa community feed" },
      {
        property: "og:description",
        content: "Share updates and work samples, and connect with talent and clients.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  const { user } = useAuth();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["feed", user?.id],
    queryFn: () => fetchFeed(user?.id),
  });

  return (
    <AppShell>
      <ScreenHeader
        title="Community"
        subtitle="Updates from talent and clients"
        action={
          <div className="flex items-center gap-1">
            <Link
              to="/network"
              aria-label="Your network"
              className="flex size-9 items-center justify-center rounded-full border border-border bg-card"
            >
              <UsersThree size={18} />
            </Link>
            <NotificationBell />
          </div>
        }
      />

      <div className="space-y-3 px-4 pb-6">
        <PostComposer />

        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading the feed…</p>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-sm font-semibold">No posts yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Share your first update — it appears here for everyone on Afrixa.
            </p>
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </AppShell>
  );
}
