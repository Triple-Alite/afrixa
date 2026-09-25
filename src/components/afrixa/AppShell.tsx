import { Link, useRouter } from "@tanstack/react-router";
import {
  ChatCircleDots,
  Compass,
  House,
  Plus,
  UserCircle,
  UsersThree,
} from "@phosphor-icons/react";
import { CaretLeft } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/home", label: "Home", Icon: House },
  { to: "/explore", label: "Explore", Icon: Compass },
  { to: "/gigs", label: "Gigs", Icon: Plus },
  { to: "/feed", label: "Network", Icon: UsersThree },
  { to: "/messages", label: "Chats", Icon: ChatCircleDots },
  { to: "/profile", label: "Profile", Icon: UserCircle },
] as const;


export function BottomNav() {
  const { profile } = useAuth();
  const isClient = profile?.role === "client";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="flex items-stretch justify-between">
        {NAV.filter(({ to }) => !(isClient && to === "/explore")).map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeProps={{ "data-active": "true" } as never}
              className="group flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors data-[active=true]:text-primary"
            >
              {label === "Gigs" ? (
                <span className="surface-hero -mt-5 flex size-11 items-center justify-center rounded-2xl text-primary-foreground shadow-lift">
                  <Icon size={22} weight="bold" />
                </span>
              ) : (
                <Icon size={22} className="shrink-0" />
              )}
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  back,
  action,
  tone = "light",
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: ReactNode;
  tone?: "light" | "dark";
}) {
  const router = useRouter();
  const dark = tone === "dark";
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center gap-3 px-4 py-4",
        dark ? "surface-hero text-primary-foreground" : "bg-background/90 backdrop-blur",
      )}
    >
      {back ? (
        <button
          type="button"
          aria-label="Go back"
          onClick={() => router.history.back()}
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full border",
            dark ? "border-white/20" : "border-border bg-card",
          )}
        >
          <CaretLeft size={18} />
        </button>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold">{title}</h1>
        {subtitle ? (
          <p className={cn("truncate text-xs", dark ? "text-white/70" : "text-muted-foreground")}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

export function AppShell({
  children,
  nav = true,
  className,
}: {
  children: ReactNode;
  nav?: boolean;
  className?: string;
}) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-background">
      <div className={cn(nav && "pb-24", className)}>{children}</div>
      {nav ? <BottomNav /> : null}
    </div>
  );
}
