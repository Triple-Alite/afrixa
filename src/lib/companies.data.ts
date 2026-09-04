import { supabase } from "@/integrations/supabase/client";
import type { Opportunity } from "@/lib/afrixa";

export type Company = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  tagline: string | null;
  about: string | null;
  industry: string | null;
  location: string | null;
  website: string | null;
  company_size: string | null;
  logo_url: string | null;
  cover_url: string | null;
  created_at: string;
};

export type CompanyInput = {
  name: string;
  tagline: string;
  about: string;
  industry: string;
  location: string;
  website: string;
  company_size: string;
  logo_url: string | null;
  cover_url: string | null;
};

export const INDUSTRIES = [
  "Technology",
  "Design & Creative",
  "Finance & Fintech",
  "Media & Entertainment",
  "Health",
  "Education",
  "Agriculture",
  "Logistics",
  "Energy",
  "Non-profit",
  "Other",
] as const;

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;

const COMPANY_COLUMNS =
  "id,owner_id,name,slug,tagline,about,industry,location,website,company_size,logo_url,cover_url,created_at";

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function fetchCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from("companies")
    .select(COMPANY_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(120);
  if (error) throw error;
  return (data ?? []) as Company[];
}

export async function fetchCompanyBySlug(slug: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from("companies")
    .select(COMPANY_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as Company | null) ?? null;
}

export async function fetchMyCompany(ownerId: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from("companies")
    .select(COMPANY_COLUMNS)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Company | null) ?? null;
}

export async function fetchCompanyJobs(company: Company): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .or(`company_id.eq.${company.id},company.eq.${company.name}`)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  return (data ?? []) as Opportunity[];
}

async function uniqueSlug(base: string, ignoreId?: string) {
  const root = base || "company";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const { data, error } = await supabase.from("companies").select("id").eq("slug", candidate).maybeSingle();
    if (error) throw error;
    if (!data || data.id === ignoreId) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

function payload(input: CompanyInput) {
  return {
    name: input.name.trim(),
    tagline: input.tagline.trim() || null,
    about: input.about.trim() || null,
    industry: input.industry || null,
    location: input.location.trim() || null,
    website: input.website.trim() || null,
    company_size: input.company_size || null,
    logo_url: input.logo_url,
    cover_url: input.cover_url,
  };
}

export async function createCompany(ownerId: string, input: CompanyInput): Promise<Company> {
  const slug = await uniqueSlug(slugify(input.name));
  const { data, error } = await supabase
    .from("companies")
    .insert({ ...payload(input), owner_id: ownerId, slug })
    .select(COMPANY_COLUMNS)
    .single();
  if (error) throw error;
  return data as Company;
}

export async function updateCompany(company: Company, input: CompanyInput): Promise<Company> {
  const nextSlug =
    slugify(input.name) && slugify(input.name) !== company.slug
      ? await uniqueSlug(slugify(input.name), company.id)
      : company.slug;
  const { data, error } = await supabase
    .from("companies")
    .update({ ...payload(input), slug: nextSlug })
    .eq("id", company.id)
    .select(COMPANY_COLUMNS)
    .single();
  if (error) throw error;
  return data as Company;
}
