import { useState } from "react";
import { toast } from "sonner";
import { ImageSquare, UploadSimple } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadUserFile } from "@/lib/uploads";
import { COMPANY_SIZES, INDUSTRIES, type Company, type CompanyInput } from "@/lib/companies.data";

const MAX_BYTES = 5 * 1024 * 1024;

export function CompanyForm({
  userId,
  company,
  saving,
  onSubmit,
  onCancel,
}: {
  userId: string;
  company?: Company | null;
  saving?: boolean;
  onSubmit: (input: CompanyInput) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<CompanyInput>({
    name: company?.name ?? "",
    tagline: company?.tagline ?? "",
    about: company?.about ?? "",
    industry: company?.industry ?? "",
    location: company?.location ?? "",
    website: company?.website ?? "",
    company_size: company?.company_size ?? "",
    logo_url: company?.logo_url ?? null,
    cover_url: company?.cover_url ?? null,
  });
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);

  const set = <K extends keyof CompanyInput>(key: K, value: CompanyInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function pick(kind: "logo" | "cover", file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("Images must be 5MB or smaller.");
      return;
    }
    setUploading(kind);
    try {
      const url = await uploadUserFile("portfolio", userId, file);
      set(kind === "logo" ? "logo_url" : "cover_url", url);
      toast.success(kind === "logo" ? "Logo uploaded" : "Cover uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!form.name.trim()) {
          toast.error("Add a company name.");
          return;
        }
        onSubmit(form);
      }}
    >
      <div className="space-y-2">
        <Label>Cover image</Label>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-muted">
          {form.cover_url ? (
            <img src={form.cover_url} alt="Company cover" className="h-28 w-full object-cover" />
          ) : (
            <div className="flex h-28 w-full items-center justify-center text-muted-foreground">
              <ImageSquare size={24} />
            </div>
          )}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-primary">
          <UploadSimple size={14} />
          {uploading === "cover" ? "Uploading…" : "Upload cover"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => void pick("cover", event.target.files?.[0])}
          />
        </label>
      </div>

      <div className="space-y-2">
        <Label>Logo</Label>
        <div className="flex items-center gap-3">
          {form.logo_url ? (
            <img src={form.logo_url} alt="Company logo" className="size-14 rounded-xl border border-border object-cover" />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ImageSquare size={20} />
            </span>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-primary">
            <UploadSimple size={14} />
            {uploading === "logo" ? "Uploading…" : "Upload logo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void pick("logo", event.target.files?.[0])}
            />
          </label>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="company-name">Company name</Label>
        <Input
          id="company-name"
          value={form.name}
          onChange={(event) => set("name", event.target.value)}
          placeholder="Afrixa Studios"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="company-tagline">Tagline</Label>
        <Input
          id="company-tagline"
          value={form.tagline}
          onChange={(event) => set("tagline", event.target.value)}
          placeholder="Product design studio for African fintech"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="company-industry">Industry</Label>
          <select
            id="company-industry"
            value={form.industry}
            onChange={(event) => set("industry", event.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
          >
            <option value="">Select</option>
            {INDUSTRIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company-size">Company size</Label>
          <select
            id="company-size"
            value={form.company_size}
            onChange={(event) => set("company_size", event.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
          >
            <option value="">Select</option>
            {COMPANY_SIZES.map((item) => (
              <option key={item} value={item}>
                {item} people
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="company-location">Location</Label>
        <Input
          id="company-location"
          value={form.location}
          onChange={(event) => set("location", event.target.value)}
          placeholder="Lagos, Nigeria"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="company-website">Website</Label>
        <Input
          id="company-website"
          value={form.website}
          onChange={(event) => set("website", event.target.value)}
          placeholder="https://example.com"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="company-about">About</Label>
        <Textarea
          id="company-about"
          value={form.about}
          onChange={(event) => set("about", event.target.value)}
          rows={5}
          placeholder="What your company does, who you serve and what you are hiring for."
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={saving || Boolean(uploading)}>
          {saving ? "Saving…" : company ? "Save changes" : "Create page"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
