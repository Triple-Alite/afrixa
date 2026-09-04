import { supabase } from "@/integrations/supabase/client";
import type { Opportunity } from "@/lib/afrixa";
import { skillPercent } from "@/lib/profile.data";

export type TalentSignals = {
  skills: { name: string; level: string; years: number | null }[];
  experienceText: string[];
  portfolioCategories: string[];
  primarySkill: string | null;
};

export type RecommendedGig = {
  opportunity: Opportunity;
  score: number;
  reasons: string[];
};

const STOP_WORDS = new Set([
  "and",
  "for",
  "the",
  "with",
  "you",
  "your",
  "a",
  "an",
  "of",
  "to",
  "in",
  "on",
  "at",
  "we",
  "need",
  "needed",
  "looking",
  "wanted",
  "help",
]);

function tokens(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

/** Everything we know about the signed-in talent that can be matched to a gig. */
export async function fetchTalentSignals(userId: string): Promise<TalentSignals> {
  const [skills, experience, portfolio, profile] = await Promise.all([
    supabase.from("profile_skills").select("name,level,years").eq("user_id", userId),
    supabase.from("work_experiences").select("title,company,summary").eq("user_id", userId),
    supabase.from("portfolio_items").select("category,title").eq("user_id", userId),
    supabase.from("profiles").select("primary_skill").eq("id", userId).maybeSingle(),
  ]);

  const firstError = skills.error ?? experience.error ?? portfolio.error ?? profile.error ?? null;
  if (firstError) throw new Error(firstError.message);

  return {
    skills: (skills.data ?? []).map((row) => ({
      name: row.name,
      level: row.level,
      years: row.years ? Number(row.years) : null,
    })),
    experienceText: (experience.data ?? []).map((row) =>
      [row.title, row.company, row.summary].filter(Boolean).join(" "),
    ),
    portfolioCategories: (portfolio.data ?? [])
      .map((row) => [row.category, row.title].filter(Boolean).join(" "))
      .filter(Boolean) as string[],
    primarySkill: profile.data?.primary_skill ?? null,
  };
}

export async function fetchOpenGigs(limit = 60): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as Opportunity[];
}

/** Ranks gigs against a talent's skills, experience and portfolio. */
export function rankGigs(gigs: Opportunity[], signals: TalentSignals): RecommendedGig[] {
  const experienceTokens = new Set(signals.experienceText.flatMap(tokens));
  const portfolioTokens = new Set(signals.portfolioCategories.flatMap(tokens));

  const ranked = gigs.map((opportunity) => {
    const haystack = new Set([
      ...tokens(opportunity.title),
      ...tokens(opportunity.description ?? ""),
      ...opportunity.skills.flatMap(tokens),
      ...tokens(opportunity.category),
    ]);

    let score = 0;
    const reasons: string[] = [];

    const matchedSkills = signals.skills.filter((skill) =>
      tokens(skill.name).some((token) => haystack.has(token)),
    );
    for (const skill of matchedSkills) {
      score += 30 * (skillPercent(skill.level) / 100) + Math.min(skill.years ?? 0, 8);
    }
    if (matchedSkills.length > 0) {
      reasons.push(
        `Matches your ${matchedSkills
          .slice(0, 3)
          .map((skill) => skill.name)
          .join(", ")}`,
      );
    }

    if (
      signals.primarySkill &&
      tokens(signals.primarySkill).some((token) => haystack.has(token))
    ) {
      score += 15;
      reasons.push(`Close to your main skill`);
    }

    const experienceHits = [...experienceTokens].filter((token) => haystack.has(token)).length;
    if (experienceHits > 0) {
      score += Math.min(experienceHits * 5, 20);
      reasons.push("Similar to your past work");
    }

    const portfolioHits = [...portfolioTokens].filter((token) => haystack.has(token)).length;
    if (portfolioHits > 0) {
      score += Math.min(portfolioHits * 4, 16);
      reasons.push("Like projects in your portfolio");
    }

    if (opportunity.escrow_funded) {
      score += 6;
      reasons.push("Payment already secured");
    }

    return { opportunity, score, reasons };
  });

  return ranked.filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
}

export function matchPercent(score: number) {
  return Math.max(20, Math.min(99, Math.round((score / 90) * 100)));
}
