import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading, profile, profileLoading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "signin" } });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (loading || profileLoading || !user) return;
    const needsOnboarding = !profile?.onboarding_complete;
    if (needsOnboarding && pathname !== "/onboarding") navigate({ to: "/onboarding" });
  }, [loading, profileLoading, user, profile, pathname, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="size-8 animate-spin rounded-full border-2 border-border border-t-secondary" />
      </div>
    );
  }

  return <Outlet />;
}
