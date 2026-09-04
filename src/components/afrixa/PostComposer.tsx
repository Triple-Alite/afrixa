import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageSquare, PaperPlaneTilt, X } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { uploadUserFile } from "@/lib/uploads";
import { initials } from "@/lib/afrixa";
import { POST_KINDS, type PostKind, type PostVisibility } from "@/lib/social";
import { cn } from "@/lib/utils";

export function PostComposer() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<PostKind>("update");
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const publish = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to post");
      const { error } = await supabase.from("posts").insert({
        author_id: user.id,
        body: body.trim(),
        kind,
        visibility,
        image_url: imageUrl,
        link_url: linkUrl.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      setLinkUrl("");
      setImageUrl(null);
      setKind("update");
      setVisibility("public");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Shared with your network");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function onPickImage(file: File | undefined) {
    if (!file || !user) return;
    setUploading(true);
    try {
      const url = await uploadUserFile("portfolio", user.id, file);
      setImageUrl(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold text-muted-foreground">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="size-full object-cover" />
          ) : (
            initials(profile?.full_name ?? "")
          )}
        </span>
        {open ? null : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex-1 rounded-full border border-border px-4 py-2.5 text-left text-sm text-muted-foreground"
          >
            Share an update, win or work sample…
          </button>
        )}
        {open ? (
          <p className="flex-1 text-sm font-semibold">Create a post</p>
        ) : null}
        {open ? (
          <button type="button" aria-label="Close composer" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-3 space-y-3">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="What are you working on?"
            rows={4}
            autoFocus
          />

          <div className="flex flex-wrap gap-1.5">
            {POST_KINDS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setKind(item.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  kind === item.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Input
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            placeholder="Add a link (optional)"
            inputMode="url"
          />

          {imageUrl ? (
            <div className="relative overflow-hidden rounded-xl border border-border">
              <img src={imageUrl} alt="Post attachment" className="max-h-56 w-full object-cover" />
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => setImageUrl(null)}
                className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5"
              >
                <X size={14} />
              </button>
            </div>
          ) : null}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => onPickImage(event.target.files?.[0])}
          />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <ImageSquare size={16} />
                {uploading ? "Uploading…" : "Photo"}
              </Button>
              <button
                type="button"
                onClick={() =>
                  setVisibility((prev) => (prev === "public" ? "connections" : "public"))
                }
                className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                {visibility === "public" ? "Anyone" : "Connections only"}
              </button>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={!body.trim() || publish.isPending}
              onClick={() => publish.mutate()}
            >
              <PaperPlaneTilt size={16} />
              {publish.isPending ? "Posting…" : "Post"}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
