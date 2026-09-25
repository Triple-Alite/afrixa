import { supabase } from "@/integrations/supabase/client";

export type SkillLevel = "beginner" | "intermediate" | "advanced" | "expert";

export type ProfileSkill = {
  id: string;
  name: string;
  level: string;
  years: number | null;
};

export type WorkExperience = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  employment_type: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  summary: string | null;
};

export type EducationEntry = {
  id: string;
  school: string;
  qualification: string | null;
  field_of_study: string | null;
  start_year: number | null;
  end_year: number | null;
};

export type Certification = {
  id: string;
  name: string;
  issuer: string;
  issue_date: string | null;
  expiry_date: string | null;
  credential_url: string | null;
};

export type ProfileDossier = {
  skills: ProfileSkill[];
  experience: WorkExperience[];
  education: EducationEntry[];
  certifications: Certification[];
};

export const SKILL_LEVELS: { value: SkillLevel; label: string; percent: number }[] = [
  { value: "beginner", label: "Beginner", percent: 25 },
  { value: "intermediate", label: "Intermediate", percent: 50 },
  { value: "advanced", label: "Advanced", percent: 75 },
  { value: "expert", label: "Expert", percent: 100 },
];

export function skillPercent(level: string) {
  return SKILL_LEVELS.find((item) => item.value === level)?.percent ?? 50;
}

export function monthYear(value: string | null) {
  if (!value) return "Present";
  return new Date(value).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export async function fetchProfileDossier(userId: string): Promise<ProfileDossier> {
  const [skills, experience, education, certifications] = await Promise.all([
    supabase
      .from("profile_skills")
      .select("id,name,level,years")
      .eq("user_id", userId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("work_experiences")
      .select("id,title,company,location,employment_type,start_date,end_date,is_current,summary")
      .eq("user_id", userId)
      .order("start_date", { ascending: false }),
    supabase
      .from("education_entries")
      .select("id,school,qualification,field_of_study,start_year,end_year")
      .eq("user_id", userId)
      .order("end_year", { ascending: false, nullsFirst: true }),
    supabase
      .from("certifications")
      .select("id,name,issuer,issue_date,expiry_date,credential_url")
      .eq("user_id", userId)
      .order("issue_date", { ascending: false, nullsFirst: true }),
  ]);

  const firstError =
    skills.error ?? experience.error ?? education.error ?? certifications.error ?? null;
  if (firstError) throw new Error(firstError.message);

  return {
    skills: (skills.data ?? []).map((row) => ({ ...row, years: row.years ? Number(row.years) : null })),
    experience: experience.data ?? [],
    education: education.data ?? [],
    certifications: certifications.data ?? [],
  };
}

/** Top skills for several people at once — used by the network page. */
export async function fetchSkillsForPeople(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string[]>();
  const { data, error } = await supabase
    .from("profile_skills")
    .select("user_id,name,position")
    .in("user_id", userIds)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  const map = new Map<string, string[]>();
  for (const row of data ?? []) {
    const list = map.get(row.user_id) ?? [];
    if (list.length < 3) list.push(row.name);
    map.set(row.user_id, list);
  }
  return map;
}

export async function addSkill(
  userId: string,
  input: { name: string; level: SkillLevel; years?: number | null },
) {
  const { count } = await supabase
    .from("profile_skills")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  const { error } = await supabase.from("profile_skills").insert({
    user_id: userId,
    name: input.name,
    level: input.level,
    years: input.years ?? null,
    position: (count ?? 0) + 1,
  });
  if (error) throw new Error(error.message);
}

export async function addExperience(
  userId: string,
  input: {
    title: string;
    company: string;
    location?: string | null;
    start_date: string;
    end_date?: string | null;
    is_current: boolean;
    summary?: string | null;
  },
) {
  const { error } = await supabase.from("work_experiences").insert({
    user_id: userId,
    title: input.title,
    company: input.company,
    location: input.location ?? null,
    start_date: input.start_date,
    end_date: input.is_current ? null : (input.end_date ?? null),
    is_current: input.is_current,
    summary: input.summary ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function addEducation(
  userId: string,
  input: {
    school: string;
    qualification?: string | null;
    field_of_study?: string | null;
    start_year?: number | null;
    end_year?: number | null;
  },
) {
  const { error } = await supabase.from("education_entries").insert({
    user_id: userId,
    school: input.school,
    qualification: input.qualification ?? null,
    field_of_study: input.field_of_study ?? null,
    start_year: input.start_year ?? null,
    end_year: input.end_year ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function addCertification(
  userId: string,
  input: {
    name: string;
    issuer: string;
    issue_date?: string | null;
    expiry_date?: string | null;
    credential_url?: string | null;
  },
) {
  const { error } = await supabase.from("certifications").insert({
    user_id: userId,
    name: input.name,
    issuer: input.issuer,
    issue_date: input.issue_date ?? null,
    expiry_date: input.expiry_date ?? null,
    credential_url: input.credential_url ?? null,
  });
  if (error) throw new Error(error.message);
}

export type DossierTable =
  | "profile_skills"
  | "work_experiences"
  | "education_entries"
  | "certifications";

export async function deleteDossierRow(table: DossierTable, id: string) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateHourlyRate(userId: string, rate: number | null) {
  const { error } = await supabase.from("profiles").update({ hourly_rate: rate }).eq("id", userId);
  if (error) throw new Error(error.message);
}

/** Shares a new position with the network as a feed post, optionally updating the headline. */
export async function announcePosition(
  userId: string,
  input: { title: string; company: string; summary?: string | null; is_current: boolean },
  opts: { share: boolean; updateHeadline: boolean },
) {
  if (opts.updateHeadline) {
    const { error } = await supabase
      .from("profiles")
      .update({ headline: `${input.title} at ${input.company}` })
      .eq("id", userId);
    if (error) throw new Error(error.message);
  }
  if (opts.share) {
    const lead = input.is_current
      ? `I'm happy to share that I'm starting a new position as ${input.title} at ${input.company}!`
      : `I've added a past role to my profile: ${input.title} at ${input.company}.`;
    const body = input.summary ? `${lead}\n\n${input.summary}` : lead;
    const { error } = await supabase
      .from("posts")
      .insert({ author_id: userId, body, kind: "position", visibility: "public" });
    if (error) throw new Error(error.message);
  }
}
