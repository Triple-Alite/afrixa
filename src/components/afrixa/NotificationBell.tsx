import { Link } from "@tanstack/react-router";
import { Bell } from "@phosphor-icons/react";

import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

export function NotificationBell({ tone = "dark" }: { tone?: "light" | "dark" }) {
  const { unread } = useNotifications();

  return (
    <Link
      to="/notifications"
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      className={cn(
        "relative flex size-9 items-center justify-center rounded-full",
        tone === "dark" ? "bg-white/15" : "border border-border bg-card",
      )}
    >
      <Bell size={18} />
      {unread ? (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
