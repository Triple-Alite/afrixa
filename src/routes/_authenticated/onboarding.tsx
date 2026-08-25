import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Briefcase, UserFocus } from "@phosphor-icons/react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  COUNTRIES,
  EXPERIENCE_LEVELS,
  LANGUAGES,
  SKILLS,
} from "@/lib/afrixa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your Afrixa profile" },
      {
        name: "description",
        content:
          "Tell Afrixa whether you're hiring or looking for work, then complete your profile to unlock matched opportunities.",
      },
      { property: "og:title", content: "Set up your Afrixa profile" },
      {
        property: "og:description",
        content: "Complete onboarding to get matched with verified opportunities on Afrixa.",
      },
    ],
  }),
  component: OnboardingPage,
});

const CLIENT_TYPES = ["Startup", "Agency", "Enterprise", "Individual", "NGO / Non-profit"];

function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<"talent" | "client" | null>(profile?.role ?? null);
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [country, setCountry] = useState(profile?.country ?? "");
  const [headline, setHeadline] = useState(profile?.headline ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [primarySkill, setPrimarySkill] = useState(profile?.primary_skill ?? "");
  const [years, setYears] = useState(profile?.years_experience ?? "");
  const [languages, setLanguages] = useState<string[]>(profile?.languages ?? ["English"]);
  const [businessName, setBusinessName] = useState(profile?.business_name ?? "");
  const [clientType, setClientType] = useState(profile?.client_type ?? "");
  const [busy, setBusy] = useState(false);

  function toggleLanguage(language: string) {
    setLanguages((current) =>
      current.includes(language)
        ? current.filter((item) => item !== language)
        : [...current, language],
    );
  }

  function strength() {
    const checks = [
      Boolean(fullName),
      Boolean(country),
      Boolean(role === "talent" ? headline : businessName),
      Boolean(bio),
      Boolean(role === "talent" ? primarySkill : clientType),
      languages.length > 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  async function finish() {
    if (!user || !role) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          role,
          full_name: fullName,
          country: country || null,
          headline: headline || null,
          bio: bio || null,
          primary_skill: role === "talent" ? primarySkill || null : null,
          years_experience: role === "talent" ? years || null : null,
          languages,
          business_name: role === "client" ? businessName || null : null,
          client_type: role === "client" ? clientType || null : null,
          profile_strength: strength(),
          onboarding_complete: true,
        })
        .eq("id", user.id);
      if (error) throw error;
      refreshProfile();
      toast.success("Profile ready. Welcome to Afrixa!");
      navigate({ to: "/home" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-background pb-10">
      <div className="surface-hero px-6 pb-10 pt-12 text-primary-foreground">
        <p className="text-xs font-medium uppercase tracking-wide text-white/60">
          Step {step + 1} of 2
        </p>
        <h1 className="mt-2 text-[26px] font-bold leading-tight">
          {step === 0 ? "How will you use Afrixa?" : "Complete your profile"}
        </h1>
        <p className="mt-2 text-sm text-white/70">
          {step === 0
            ? "You can switch later in settings."
            : "A stronger profile gets you seen faster."}
        </p>
      </div>

      <div className="space-y-4 px-6 py-8">
        {step === 0 ? (
          <>
            <RoleCard
              active={role === "talent"}
              onClick={() => setRole("talent")}
              title="I'm looking for work"
              description="Find jobs, gigs, freelance projects, internships and grants."
              icon={<UserFocus size={22} weight="bold" />}
            />
            <RoleCard
              active={role === "client"}
              onClick={() => setRole("client")}
              title="I'm hiring talent"
              description="Post roles and pay safely through escrow."
              icon={<Briefcase size={22} weight="bold" />}
            />
            <Button
              className="h-12 w-full"
              disabled={!role}
              onClick={() => setStep(1)}
            >
              Continue
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="h-12 bg-card"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="h-12 bg-card">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {role === "talent" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="headline">Professional headline</Label>
                  <Input
                    id="headline"
                    value={headline}
                    onChange={(event) => setHeadline(event.target.value)}
                    placeholder="Senior Product Designer"
                    className="h-12 bg-card"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Primary skill</Label>
                  <Select value={primarySkill} onValueChange={setPrimarySkill}>
                    <SelectTrigger className="h-12 bg-card">
                      <SelectValue placeholder="Select your main skill" />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILLS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Years of experience</Label>
                  <Select value={years} onValueChange={setYears}>
                    <SelectTrigger className="h-12 bg-card">
                      <SelectValue placeholder="Select experience" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_LEVELS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="business">Business name</Label>
                  <Input
                    id="business"
                    value={businessName}
                    onChange={(event) => setBusinessName(event.target.value)}
                    placeholder="Afrixa Studios"
                    className="h-12 bg-card"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Organisation type</Label>
                  <Select value={clientType} onValueChange={setClientType}>
                    <SelectTrigger className="h-12 bg-card">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLIENT_TYPES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="bio">About</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                rows={4}
                placeholder={
                  role === "talent"
                    ? "Share what you do and the results you deliver."
                    : "Tell talent about your company and what you're building."
                }
                className="bg-card"
              />
            </div>

            <div className="space-y-2">
              <Label>Languages</Label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((language) => (
                  <button
                    key={language}
                    type="button"
                    onClick={() => toggleLanguage(language)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      languages.includes(language)
                        ? "border-secondary bg-secondary/10 text-secondary"
                        : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {language}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between text-xs font-medium">
                <span>Profile strength</span>
                <span className="text-secondary">{strength()}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-secondary transition-all"
                  style={{ width: `${strength()}%` }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="h-12 flex-1" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button
                className="h-12 flex-1"
                disabled={busy || !fullName}
                onClick={finish}
              >
                {busy ? "Saving…" : "Finish"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RoleCard({
  active,
  onClick,
  title,
  description,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border bg-card p-4 text-left transition-all",
        active ? "border-secondary shadow-lift" : "border-border shadow-card",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          active ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}
