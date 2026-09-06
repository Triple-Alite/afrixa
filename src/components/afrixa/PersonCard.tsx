import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChatCircleDots, SealCheck, UserPlus } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { initials } from "@/lib/afrixa";
import { openDirectConversation, requestConnection, toggleFollow } from "@/lib/social.data";
import type { PersonSuggestion } from "@/lib/social.data";

export function PersonCard({ person }: { person: PersonSuggestion }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["people"] });

  const connect = useMutation({
    mutationFn: () => requestConnection(user!.id, person.id),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["network"] });
      toast.success("Request sent");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const follow = useMutation({
    mutationFn: () => toggleFollow(user!.id, person.id, person.following),
    onSuccess: (nowFollowing) => {
      invalidate();
      toast.success(nowFollowing ? "Following" : "Unfollowed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const message = useMutation({
    mutationFn: () => openDirectConversation(user!.id, person.id),
    onSuccess: (id) => navigate({ to: "/messages/$id", params: { id } }),
    onError: (error: Error) => toast.error(error.message),
  });

  const connectLabel =
    person.connection === "connected" ? "Connected" : person.connection === "pending" ? "Pending" : "Connect";

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <Link
          to="/talent/$id"
          params={{ id: person.id }}
          className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold text-muted-foreground"
        >
          {person.avatar_url ? (
            <img src={person.avatar_url} alt="" className="size-full object-cover" />
          ) : (
            initials(person.full_name ?? "A")
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-sm font-semibold">
            <span className="truncate">{person.full_name ?? "Afrixa member"}</span>
            {person.verified ? <SealCheck size={14} weight="fill" className="text-secondary" /> : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {person.headline ?? person.primary_skill ?? "Afrixa member"}
            {person.country ? ` · ${person.country}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button
          size="sm"
          className="flex-1"
          disabled={person.connection !== "none" || connect.isPending}
          onClick={() => connect.mutate()}
        >
          <UserPlus size={14} className="mr-1" />
          {connectLabel}
        </Button>
        <Button
          size="sm"
          variant={person.following ? "secondary" : "outline"}
          className="flex-1"
          disabled={follow.isPending}
          onClick={() => follow.mutate()}
        >
          {person.following ? "Following" : "Follow"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          aria-label={`Message ${person.full_name ?? "member"}`}
          disabled={message.isPending}
          onClick={() => message.mutate()}
        >
          <ChatCircleDots size={16} />
        </Button>
      </div>
    </div>
  );
}
