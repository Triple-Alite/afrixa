import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Camera, Certificate, Gear, Plus, ShieldCheck, SignOut, Users } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { uploadUserFile } from "@/lib/uploads";
import { initials, money } from "@/lib/afrixa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ProfileDossierEditor } from "@/components/afrixa/ProfileDossierEditor";
import { Progress } from "@/components/ui/progress";


export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Afrixa" },
      {
        name: "description",
        content: "Review your Afrixa profile, portfolio, skills verification and account progress.",
      },
      { property: "og:title", content: "Profile — Afrixa" },
      {
        property: "og:description",
        content: "Afrixa profile, portfolio and verified work reputation in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const { unread } = useNotifications();
  const avatarInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [newItem, setNewItem] = useState({ title: "", category: "" });

  const discoverable = (profile as { discoverable?: boolean } | null)?.discoverable ?? true;

  const { data: escrowBalance = 0 } = useQuery({
    queryKey: ["escrow-balance", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escrows")
        .select("amount,status")
        .in("status", ["funded", "in_progress", "delivered"]);
      if (error) throw error;
      return (data ?? []).reduce((total, row) => total + Number(row.amount), 0);
    },
  });

  async function onAvatarPicked(file: File | undefined) {
    if (!file || !user) return;
    setBusy(true);
    try {
      const url = await uploadUserFile("avatars", user.id, file);
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (error) throw error;
      refreshProfile();
      toast.success("Profile photo updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleDiscoverable(next: boolean) {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ discoverable: next }).eq("id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    refreshProfile();
    toast.success(next ? "You are visible to clients" : "Hidden from talent search");
  }

  async function addPortfolioItem() {
    if (!user || !newItem.title.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("portfolio_items").insert({
        user_id: user.id,
        title: newItem.title.trim(),
        category: newItem.category.trim() || null,
      });
      if (error) throw error;
      setNewItem({ title: "", category: "" });
      await queryClient.invalidateQueries({ queryKey: ["portfolio", user.id] });
      toast.success("Portfolio item added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save item");
    } finally {
      setBusy(false);
    }
  }


  const { data: portfolio = [] } = useQuery({
    queryKey: ["portfolio", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("portfolio_items")
        .select("id,title,category,link_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: assessments = [] } = useQuery({
    queryKey: ["assessments", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("assessments")
        .select("id,skill,score,level,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const latestAssessment = assessments[0];

  return (
    <AppShell>
      <ScreenHeader
        title="Profile"
        subtitle={profile?.role === "client" ? "Hiring account" : "Talent account"}
        action={
          <div className="flex items-center gap-1">
            <Link
              to="/notifications"
              aria-label="Notifications"
              className="relative flex size-9 items-center justify-center rounded-full border border-border bg-card"
            >
              <Bell size={18} />
              {unread ? (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-secondary-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
            <Button variant="ghost" size="icon" aria-label="Settings">
              <Gear size={18} />
            </Button>
          </div>
        }
      />
      <main className="space-y-5 px-4">
        <section className="surface-hero rounded-2xl p-5 text-primary-foreground shadow-lift">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => avatarInput.current?.click()}
              disabled={busy}
              aria-label="Change profile photo"
              className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-white/15"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile photo" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-lg font-bold">
                  {initials(profile?.full_name)}
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/40 py-0.5">
                <Camera size={12} weight="bold" />
              </span>
            </button>
            <input
              ref={avatarInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => void onAvatarPicked(event.target.files?.[0])}
            />

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-bold">{profile?.full_name ?? "Afrixa member"}</h2>
              <p className="mt-1 text-sm text-primary-foreground/75">
                {profile?.headline ?? profile?.business_name ?? "Ready for verified work"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium">
                {profile?.verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1">
                    <ShieldCheck size={13} weight="fill" /> Verified
                  </span>
                ) : (
                  <Link to="/verify" className="inline-flex items-center gap-1 rounded-full bg-gold px-2 py-1 text-foreground">
                    <ShieldCheck size={13} /> Get verified
                  </Link>
                )}
                {profile?.country ? <span className="rounded-full bg-white/15 px-2 py-1">{profile.country}</span> : null}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs text-muted-foreground">Profile strength</p>
            <p className="mt-1 text-xl font-bold text-secondary">{profile?.profile_strength ?? 0}%</p>
            <Progress value={profile?.profile_strength ?? 0} className="mt-3 h-2" />
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs text-muted-foreground">In escrow</p>
            <p className="mt-1 text-xl font-bold">{money(escrowBalance)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs text-muted-foreground">Total earned</p>
            <p className="mt-1 text-xl font-bold">{money(profile?.total_earned ?? 0)}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Skill assessment</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {latestAssessment
                  ? `${latestAssessment.level} · ${latestAssessment.score}%`
                  : "Earn a visible skills badge"}
              </p>
            </div>
            <Link
              to="/assessment"
              className="inline-flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
              aria-label="Open assessment"
            >
              <Certificate size={18} weight="bold" />
            </Link>
          </div>
        </section>

        {profile?.role === "client" ? (
          <section className="grid grid-cols-2 gap-3">
            <Link
              to="/proposals"
              className="rounded-2xl border border-border bg-card p-4 text-sm font-semibold shadow-card"
            >
              <Certificate size={20} className="mb-2 text-primary" /> Proposals
            </Link>
            <Link
              to="/talent"
              className="rounded-2xl border border-border bg-card p-4 text-sm font-semibold shadow-card"
            >
              <Users size={20} className="mb-2 text-secondary" /> Find talent
            </Link>
          </section>
        ) : (
          <section className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="pr-3">
              <h2 className="text-base font-semibold">Discoverable</h2>
              <p className="mt-1 text-xs text-muted-foreground">Let clients find you in talent search</p>
            </div>
            <Switch checked={discoverable} onCheckedChange={(next) => void toggleDiscoverable(next)} />
          </section>
        )}

        {profile?.role === "client" ? null : (
          <ProfileDossierEditor
            userId={user!.id}
            hourlyRate={profile?.hourly_rate ?? null}
            onRateSaved={refreshProfile}
          />
        )}

        <section>
          <h2 className="text-base font-semibold">Portfolio</h2>
          <div className="mt-3 space-y-3">
            {portfolio.length ? (
              portfolio.map((item) => (
                <article key={item.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{item.category ?? "Portfolio item"}</p>
                </article>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Add portfolio work to strengthen your profile.
              </p>
            )}

            <div className="space-y-2 rounded-2xl border border-border bg-card p-4 shadow-card">
              <Input
                value={newItem.title}
                onChange={(event) => setNewItem((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Project title"
                className="h-11 rounded-xl"
              />
              <Input
                value={newItem.category}
                onChange={(event) => setNewItem((prev) => ({ ...prev, category: event.target.value }))}
                placeholder="Category (optional)"
                className="h-11 rounded-xl"
              />
              <Button
                className="h-11 w-full"
                disabled={busy || !newItem.title.trim()}
                onClick={() => void addPortfolioItem()}
              >
                <Plus size={16} /> Add portfolio item
              </Button>
            </div>
          </div>
        </section>


        <Button variant="outline" className="h-12 w-full bg-card" onClick={() => signOut()}>
          <SignOut size={16} /> Sign out
        </Button>
      </main>
    </AppShell>
  );
}