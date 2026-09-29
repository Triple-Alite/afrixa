import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IdentificationCard, SealCheck, Clock, XCircle } from "@phosphor-icons/react";
import { toast } from "sonner";

import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/verify")({
  head: () => ({
    meta: [
      { title: "Verify your identity — Afrixa" },
      { name: "description", content: "Verify your Afrixa account with your NIN or a government-issued ID." },
      { property: "og:title", content: "Verify your identity — Afrixa" },
      { property: "og:description", content: "Get a verified badge with NIN, passport, driver's licence or CAC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyPage,
});

const ID_TYPES = [
  { value: "nin", label: "NIN (National Identity Number)" },
  { value: "passport", label: "International passport" },
  { value: "drivers_license", label: "Driver's licence" },
  { value: "voters_card", label: "Voter's card" },
  { value: "cac", label: "CAC certificate (organizations)" },
] as const;

const MAX = 10 * 1024 * 1024;

async function uploadPrivate(userId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("verifications").upload(path, file);
  if (error) throw error;
  return path;
}

function VerifyPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const isOrg = profile?.client_type === "Organization";
  const [idType, setIdType] = useState<string>(isOrg ? "cac" : "nin");
  const [idNumber, setIdNumber] = useState("");
  const [fullName, setFullName] = useState(profile?.business_name || profile?.full_name || "");
  const [doc, setDoc] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);

  const { data: latest, isLoading } = useQuery({
    queryKey: ["verification", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("identity_verifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in");
      const digits = idNumber.replace(/\s/g, "");
      if (idType === "nin" && !/^\d{11}$/.test(digits)) throw new Error("NIN must be 11 digits.");
      if (digits.length < 4) throw new Error("Enter your ID number.");
      if (!fullName.trim()) throw new Error("Enter the name on your ID.");
      if (!doc) throw new Error("Upload a photo or scan of your ID.");
      if (doc.size > MAX || (selfie && selfie.size > MAX)) throw new Error("Files must be 10MB or smaller.");
      const document_path = await uploadPrivate(user.id, doc);
      const selfie_path = selfie ? await uploadPrivate(user.id, selfie) : null;
      const { error } = await supabase.from("identity_verifications").insert({
        user_id: user.id,
        id_type: idType,
        id_number_last4: digits.slice(-4),
        full_name: fullName.trim(),
        document_path,
        selfie_path,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Submitted — we'll review your ID shortly.");
      qc.invalidateQueries({ queryKey: ["verification"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const status = profile?.verified ? "approved" : latest?.status;

  return (
    <AppShell>
      <ScreenHeader title="Verify identity" subtitle="Earn a verified badge on your profile" />
      <div className="space-y-4 px-4 pb-8">
        {isLoading ? null : status === "approved" ? (
          <StatusCard icon={<SealCheck size={22} weight="fill" />} title="You're verified" text="Your verified badge shows on your profile and posts." />
        ) : status === "pending" ? (
          <StatusCard icon={<Clock size={22} />} title="Under review" text={`Your ${ID_TYPES.find((t) => t.value === latest?.id_type)?.label ?? "ID"} ending ${latest?.id_number_last4} is being checked. This usually takes 1–2 business days.`} />
        ) : (
          <>
            {status === "rejected" ? (
              <StatusCard icon={<XCircle size={22} />} title="Verification not approved" text={latest?.review_note || "Please resubmit a clear photo of a valid ID."} />
            ) : null}
            <div className="flex gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
              <IdentificationCard size={26} className="shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Your documents are stored privately and only used to confirm who you are. We only keep the last 4 digits of your ID number on file.
              </p>
            </div>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                submit.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="id-type">ID type</Label>
                <select id="id-type" value={idType} onChange={(e) => setIdType(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm">
                  {ID_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="id-number">{idType === "nin" ? "NIN" : idType === "cac" ? "RC / BN number" : "ID number"}</Label>
                <Input id="id-number" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} inputMode={idType === "nin" ? "numeric" : "text"} placeholder={idType === "nin" ? "11-digit NIN" : "Document number"} className="h-11 bg-card" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="id-name">{idType === "cac" ? "Registered business name" : "Full name on ID"}</Label>
                <Input id="id-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11 bg-card" />
              </div>
              <FilePick label={idType === "cac" ? "Upload CAC certificate" : "Upload ID (front)"} file={doc} onPick={setDoc} accept="image/*,application/pdf" />
              {idType !== "cac" ? <FilePick label="Selfie holding your ID (optional, faster review)" file={selfie} onPick={setSelfie} accept="image/*" /> : null}
              <Button type="submit" className="h-12 w-full" disabled={submit.isPending}>
                {submit.isPending ? "Submitting…" : "Submit for verification"}
              </Button>
            </form>
          </>
        )}
        <Link to="/profile" className="block text-center text-xs font-semibold text-secondary">Back to profile</Link>
      </div>
    </AppShell>
  );
}

function StatusCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
      <span className="text-primary">{icon}</span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function FilePick({ label, file, onPick, accept }: { label: string; file: File | null; onPick: (f: File | null) => void; accept: string }) {
  return (
    <label className="block cursor-pointer rounded-2xl border border-dashed border-border bg-card p-4 text-center">
      <span className="text-sm font-semibold">{label}</span>
      <span className="mt-1 block truncate text-xs text-muted-foreground">{file ? file.name : "JPG, PNG or PDF · up to 10MB"}</span>
      <input type="file" accept={accept} className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
    </label>
  );
}
