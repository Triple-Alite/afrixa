import { useRef, useState } from "react";
import { Camera } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { initials } from "@/lib/afrixa";
import { uploadUserFile } from "@/lib/uploads";

const MAX_BYTES = 5 * 1024 * 1024;

/** Shown to members without a profile photo; uploads one in a tap. */
export function AddPhotoPrompt() {
  const { user, profile, refreshProfile } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  if (!user || !profile || profile.avatar_url) return null;

  async function onPick(file: File | undefined) {
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > MAX_BYTES) return toast.error("Photo must be under 5MB");
    setBusy(true);
    try {
      const url = await uploadUserFile("avatars", user.id, file);
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (error) throw error;
      refreshProfile();
      toast.success("Profile photo added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
        {initials(profile.full_name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Add a profile photo</p>
        <p className="text-xs text-muted-foreground">Members with a photo get more connections.</p>
      </div>
      <Button size="sm" disabled={busy} onClick={() => input.current?.click()}>
        <Camera size={14} className="mr-1" /> {busy ? "Uploading…" : "Upload"}
      </Button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void onPick(e.target.files?.[0])}
      />
    </section>
  );
}
