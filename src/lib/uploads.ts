import { supabase } from "@/integrations/supabase/client";

const YEAR_SECONDS = 60 * 60 * 24 * 365;

function safeName(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  return `${crypto.randomUUID()}.${ext}`;
}

/** Uploads a file into the user's own folder and returns a long-lived signed URL. */
export async function uploadUserFile(
  bucket: "avatars" | "portfolio",
  userId: string,
  file: File,
): Promise<string> {
  const path = `${userId}/${safeName(file)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });
  if (error) throw error;

  const { data, error: signError } = await supabase.storage.from(bucket).createSignedUrl(path, YEAR_SECONDS);
  if (signError || !data?.signedUrl) throw signError ?? new Error("Could not create file URL");
  return data.signedUrl;
}
