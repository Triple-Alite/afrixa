import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bank, CheckCircle, DeviceMobile, Trash, ShieldCheck } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { COUNTRIES } from "@/lib/afrixa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PayoutMethod = {
  id: string;
  method: string;
  country: string | null;
  bank_name: string | null;
  bank_code: string | null;
  account_name: string | null;
  account_number: string | null;
  phone_number: string | null;
  is_default: boolean;
};

const GATEWAYS = [
  { id: "paystack", label: "Paystack", hint: "Cards, bank transfer, USSD" },
  { id: "flutterwave", label: "Flutterwave", hint: "Cards, mobile money, transfer" },
] as const;

const bankSchema = z.object({
  country: z.string().trim().min(1, "Choose a country").max(60),
  bank_name: z.string().trim().min(2, "Enter the bank name").max(80),
  bank_code: z.string().trim().max(12).optional(),
  account_name: z.string().trim().min(2, "Enter the account name").max(120),
  account_number: z
    .string()
    .trim()
    .regex(/^[0-9]{6,20}$/, "Account number must be 6–20 digits"),
});

const momoSchema = z.object({
  country: z.string().trim().min(1, "Choose a country").max(60),
  account_name: z.string().trim().min(2, "Enter the account name").max(120),
  phone_number: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{7,15}$/, "Enter a valid phone number"),
});

export const Route = createFileRoute("/_authenticated/payment-setup")({
  head: () => ({
    meta: [
      { title: "Payment setup — Afrixa" },
      {
        name: "description",
        content:
          "Add your bank or mobile money details and choose a payment method before funding a gig's escrow on Afrixa.",
      },
      { property: "og:title", content: "Payment setup — Afrixa" },
      {
        property: "og:description",
        content: "Set up bank details and a checkout method so escrow funding is one tap on Afrixa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaymentSetupPage,
});

function PaymentSetupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const [kind, setKind] = useState<"bank_transfer" | "mobile_money">("bank_transfer");
  const [gateway, setGateway] = useState<string>("paystack");
  const [form, setForm] = useState({
    country: "Nigeria",
    bank_name: "",
    bank_code: "",
    account_name: "",
    account_number: "",
    phone_number: "",
  });

  const { data: profile } = useQuery({
    queryKey: ["payment-profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("preferred_gateway, country")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ["payout-methods", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payout_methods")
        .select("id, method, country, bank_name, bank_code, account_name, account_number, phone_number, is_default")
        .eq("user_id", userId!)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PayoutMethod[];
    },
  });

  useEffect(() => {
    if (profile?.preferred_gateway) setGateway(profile.preferred_gateway);
    if (profile?.country) setForm((prev) => ({ ...prev, country: profile.country as string }));
  }, [profile?.preferred_gateway, profile?.country]);

  const saveGateway = useMutation({
    mutationFn: async (value: string) => {
      const { error } = await supabase.from("profiles").update({ preferred_gateway: value }).eq("id", userId!);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Checkout method saved");
      await queryClient.invalidateQueries({ queryKey: ["payment-profile", userId] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Could not save"),
  });

  const addMethod = useMutation({
    mutationFn: async () => {
      const makeDefault = methods.length === 0;
      if (kind === "bank_transfer") {
        const parsed = bankSchema.parse(form);
        const { error } = await supabase.from("payout_methods").insert({
          user_id: userId!,
          method: "bank_transfer",
          country: parsed.country,
          bank_name: parsed.bank_name,
          bank_code: parsed.bank_code || null,
          account_name: parsed.account_name,
          account_number: parsed.account_number,
          is_default: makeDefault,
        });
        if (error) throw error;
        return;
      }
      const parsed = momoSchema.parse(form);
      const { error } = await supabase.from("payout_methods").insert({
        user_id: userId!,
        method: "mobile_money",
        country: parsed.country,
        account_name: parsed.account_name,
        phone_number: parsed.phone_number,
        is_default: makeDefault,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Payment details added");
      setForm((prev) => ({
        ...prev,
        bank_name: "",
        bank_code: "",
        account_name: "",
        account_number: "",
        phone_number: "",
      }));
      await queryClient.invalidateQueries({ queryKey: ["payout-methods", userId] });
    },
    onError: (error: unknown) => {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0]?.message ?? "Check the details you entered");
        return;
      }
      toast.error(error instanceof Error ? error.message : "Could not save these details");
    },
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      const { error: clearError } = await supabase
        .from("payout_methods")
        .update({ is_default: false })
        .eq("user_id", userId!);
      if (clearError) throw clearError;
      const { error } = await supabase.from("payout_methods").update({ is_default: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["payout-methods", userId] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Could not update"),
  });

  const removeMethod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payout_methods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Removed");
      await queryClient.invalidateQueries({ queryKey: ["payout-methods", userId] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Could not remove"),
  });

  const busy = addMethod.isPending || setDefault.isPending || removeMethod.isPending || saveGateway.isPending;
  const ready = methods.length > 0 && Boolean(profile?.preferred_gateway);

  return (
    <AppShell>
      <ScreenHeader title="Payment setup" subtitle="Bank details and checkout method" back />
      <main className="space-y-4 px-4 pb-4">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-start gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold">
                {ready ? "You're ready to fund escrow" : "Finish setup before funding escrow"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Funds are held in escrow and only released to talent when you approve the delivery.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <h2 className="text-base font-semibold">Checkout method</h2>
          <p className="mt-1 text-xs text-muted-foreground">Used when you fund a gig with a card or transfer.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {GATEWAYS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setGateway(option.id);
                  saveGateway.mutate(option.id);
                }}
                disabled={busy}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  gateway === option.id ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  {option.label}
                  {gateway === option.id ? <CheckCircle size={14} className="text-primary" /> : null}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">{option.hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <h2 className="text-base font-semibold">Add bank or mobile money details</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Used for refunds and, for talent, for payouts of released escrow.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={kind === "bank_transfer" ? "default" : "outline"}
              className="h-11"
              onClick={() => setKind("bank_transfer")}
            >
              <Bank size={16} /> Bank
            </Button>
            <Button
              type="button"
              variant={kind === "mobile_money" ? "default" : "outline"}
              className="h-11"
              onClick={() => setKind("mobile_money")}
            >
              <DeviceMobile size={16} /> Mobile money
            </Button>
          </div>

          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              addMethod.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <select
                id="country"
                value={form.country}
                onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="account_name">Account name</Label>
              <Input
                id="account_name"
                value={form.account_name}
                maxLength={120}
                placeholder="Name on the account"
                onChange={(event) => setForm((prev) => ({ ...prev, account_name: event.target.value }))}
              />
            </div>

            {kind === "bank_transfer" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="bank_name">Bank name</Label>
                  <Input
                    id="bank_name"
                    value={form.bank_name}
                    maxLength={80}
                    placeholder="e.g. GTBank"
                    onChange={(event) => setForm((prev) => ({ ...prev, bank_name: event.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="account_number">Account number</Label>
                    <Input
                      id="account_number"
                      inputMode="numeric"
                      value={form.account_number}
                      maxLength={20}
                      placeholder="0123456789"
                      onChange={(event) => setForm((prev) => ({ ...prev, account_number: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bank_code">Bank code</Label>
                    <Input
                      id="bank_code"
                      value={form.bank_code}
                      maxLength={12}
                      placeholder="Optional"
                      onChange={(event) => setForm((prev) => ({ ...prev, bank_code: event.target.value }))}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="phone_number">Mobile money number</Label>
                <Input
                  id="phone_number"
                  inputMode="tel"
                  value={form.phone_number}
                  maxLength={16}
                  placeholder="+2348012345678"
                  onChange={(event) => setForm((prev) => ({ ...prev, phone_number: event.target.value }))}
                />
              </div>
            )}

            <Button type="submit" className="h-11 w-full" disabled={busy}>
              {addMethod.isPending ? "Saving…" : "Save details"}
            </Button>
          </form>
        </section>

        <section>
          <h2 className="text-base font-semibold">Saved details</h2>
          <div className="mt-3 space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : methods.length ? (
              methods.map((item) => (
                <article key={item.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {item.method === "mobile_money" ? "Mobile money" : (item.bank_name ?? "Bank account")}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {item.account_name} ·{" "}
                        {item.method === "mobile_money"
                          ? (item.phone_number ?? "")
                          : maskAccount(item.account_number)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{item.country}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {item.is_default ? (
                        <span className="rounded-full bg-secondary/15 px-2 py-1 text-[11px] font-medium text-secondary">
                          Default
                        </span>
                      ) : (
                        <Button
                          variant="outline"
                          className="h-8 bg-card px-2 text-[11px]"
                          disabled={busy}
                          onClick={() => setDefault.mutate(item.id)}
                        >
                          Make default
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8 bg-card"
                        aria-label="Remove payment details"
                        disabled={busy}
                        onClick={() => removeMethod.mutate(item.id)}
                      >
                        <Trash size={14} />
                      </Button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No payment details yet. Add a bank account or mobile money number above.
              </p>
            )}
          </div>
        </section>

        <Button
          className="h-12 w-full"
          disabled={!ready}
          onClick={() => {
            void navigate({ to: "/proposals" });
          }}
        >
          Continue to fund a gig
        </Button>
      </main>
    </AppShell>
  );
}

function maskAccount(value: string | null) {
  if (!value) return "";
  return `•••• ${value.slice(-4)}`;
}
