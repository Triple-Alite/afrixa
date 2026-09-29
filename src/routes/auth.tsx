import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import logoImg from "@/assets/afrixa-logo.png";
import { COUNTRIES } from "@/lib/afrixa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Search = { mode?: "signin" | "signup" };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const mode = search["mode"];
    return mode === "signup" || mode === "signin" ? { mode } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in to Afrixa" },
      {
        name: "description",
        content:
          "Create your Afrixa account or sign in to access verified African talent opportunities and secure escrow payments.",
      },
      { property: "og:title", content: "Sign in to Afrixa" },
      {
        property: "og:description",
        content: "Create your Afrixa account to find or hire verified African talent.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(mode !== "signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accountType, setAccountType] = useState<"individual" | "organization">("individual");
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    if (!loading && user) navigate({ to: "/home" });
  }, [loading, user, navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (isSignUp) {
        if (!agreed) {
          toast.error("Please accept the Terms of Service to continue.");
          return;
        }
        const isOrg = accountType === "organization";
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/home`,
            data: {
              full_name: fullName,
              country,
              account_type: accountType,
              ...(isOrg ? { business_name: orgName } : {}),
            },
          },
        });
        if (error) throw error;
        toast.success("Account created. Let's set up your profile.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/home" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/home" });
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-background">
      <div className="surface-hero px-6 pb-8 pt-12 text-primary-foreground">
        <Link to="/" className="text-xs font-medium text-white/70">
          ← Back
        </Link>
        <div className="mt-5 inline-block rounded-2xl bg-card px-3 py-1">
          <img src={logoImg} alt="Afrixa" width={1020} height={539} className="h-14 w-auto" />
        </div>
        <h1 className="mt-4 text-[28px] font-bold leading-tight">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-white/70">
          {isSignUp
            ? "One account for jobs, gigs and secure escrow payments."
            : "Sign in to continue where you left off."}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4 px-6 py-8">
        {isSignUp ? (
          <div className="flex gap-1 rounded-full border border-border bg-card p-1">
            {(["individual", "organization"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setAccountType(kind)}
                className={`flex-1 rounded-full py-2 text-xs font-semibold ${
                  accountType === kind ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {kind === "individual" ? "Individual" : "Organization"}
              </button>
            ))}
          </div>
        ) : null}

        {isSignUp && accountType === "organization" ? (
          <div className="space-y-1.5">
            <Label htmlFor="orgName">Organization name</Label>
            <Input
              id="orgName"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Afrixa Technologies Ltd"
              required
              className="h-12 bg-card"
            />
          </div>
        ) : null}

        {isSignUp ? (
          <div className="space-y-1.5">
            <Label htmlFor="fullName">
              {accountType === "organization" ? "Your full name (account admin)" : "Full Name"}
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Taiye Abubakar"
              required
              className="h-12 bg-card"
            />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            required
            className="h-12 bg-card"
          />
        </div>

        {isSignUp ? (
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="h-12 bg-card">
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="h-12 bg-card"
          />
        </div>

        {isSignUp ? (
          <label className="flex items-start gap-2.5 text-xs text-muted-foreground">
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              className="mt-0.5"
            />
            <span>I agree to the Terms of Service and Privacy Policy</span>
          </label>
        ) : null}

        <Button type="submit" disabled={busy} className="h-12 w-full text-sm font-semibold">
          {busy ? "Please wait…" : isSignUp ? "Create Account" : "Sign In"}
        </Button>

        <div className="flex items-center gap-3 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={google}
          className="h-12 w-full bg-card text-sm font-semibold"
        >
          Continue with Google
        </Button>

        <p className="pt-2 text-center text-xs text-muted-foreground">
          {isSignUp ? "Already have an account?" : "New to Afrixa?"}{" "}
          <button
            type="button"
            onClick={() => setIsSignUp((v) => !v)}
            className="font-semibold text-secondary underline"
          >
            {isSignUp ? "Sign In" : "Create one"}
          </button>
        </p>
      </form>
    </div>
  );
}
