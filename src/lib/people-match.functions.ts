import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PeopleMatch = {
  id: string;
  full_name: string | null;
  headline: string | null;
  avatar_url: string | null;
  verified: boolean;
  country: string | null;
  reason: string;
};

export const recommendPeople = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ interests: z.string().trim().min(5).max(1000) }).parse(data))
  .handler(async ({ data, context }): Promise<PeopleMatch[]> => {
    const { supabase, userId } = context;
    const { rankPeople } = await import("./people-match.server");

    const { data: people, error } = await supabase
      .from("profiles")
      .select("id,full_name,headline,avatar_url,verified,country,role,primary_skill")
      .eq("discoverable", true)
      .neq("id", userId)
      .limit(80);
    if (error) throw new Error(error.message);
    if (!people?.length) return [];

    const { data: skills } = await supabase
      .from("profile_skills")
      .select("user_id,name")
      .in("user_id", people.map((p) => p.id));
    const skillMap = new Map<string, string[]>();
    for (const row of skills ?? []) {
      const list = skillMap.get(row.user_id) ?? [];
      if (list.length < 6) list.push(row.name);
      skillMap.set(row.user_id, list);
    }

    const ranked = await rankPeople(
      data.interests,
      people.map((p) => ({
        id: p.id,
        name: p.full_name ?? "Member",
        headline: p.headline,
        role: p.role,
        country: p.country,
        skills: [p.primary_skill, ...(skillMap.get(p.id) ?? [])].filter(Boolean) as string[],
      })),
    );

    const byId = new Map(people.map((p) => [p.id, p]));
    return ranked.map((r) => {
      const p = byId.get(r.id)!;
      return {
        id: p.id,
        full_name: p.full_name,
        headline: p.headline ?? p.primary_skill,
        avatar_url: p.avatar_url,
        verified: p.verified,
        country: p.country,
        reason: r.reason,
      };
    });
  });
