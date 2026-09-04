import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Buildings, Globe, MapPin, PencilSimple, UsersThree } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { CompanyForm } from "@/components/afrixa/CompanyForm";
import { OpportunityCard } from "@/components/afrixa/OpportunityCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { initials } from "@/lib/afrixa";
import {
  fetchCompanyBySlug,
  fetchCompanyJobs,
  updateCompany,
  type Company,
  type CompanyInput,
} from "@/lib/companies.data";

export const Route = createFileRoute("/_authenticated/companies/$slug")({
  head: () => ({
    meta: [
      { title: "Company page — Afrixa" },
      {
        name: "description",
        content: "See a company's story, industry, location and every open role they are hiring for on Afrixa.",
      },
      { property: "og:title", content: "Company page — Afrixa" },
      { property: "og:description", content: "Company profile and open roles on Afrixa." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompanyPage,
});

function CompanyPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: company, isLoading } = useQuery({
    queryKey: ["company", slug],
    queryFn: () => fetchCompanyBySlug(slug),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["company-jobs", company?.id],
    enabled: Boolean(company),
    queryFn: () => fetchCompanyJobs(company as Company),
  });

  const save = useMutation({
    mutationFn: (input: CompanyInput) => updateCompany(company as Company, input),
    onSuccess: async (updated) => {
      toast.success("Company page updated");
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["companies"] });
      await queryClient.invalidateQueries({ queryKey: ["company", updated.slug] });
      await queryClient.invalidateQueries({ queryKey: ["my-company", user?.id] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save changes"),
  });

  if (isLoading) {
    return (
      <AppShell>
        <ScreenHeader title="Company" back />
        <main className="px-4">
          <p className="text-sm text-muted-foreground">Loading company…</p>
        </main>
      </AppShell>
    );
  }

  if (!company) {
    return (
      <AppShell>
        <ScreenHeader title="Company" back />
        <main className="px-4">
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            This company page is not available.
          </p>
          <Link to="/companies" className="mt-3 inline-block text-sm font-semibold text-primary">
            Back to company directory
          </Link>
        </main>
      </AppShell>
    );
  }

  const isOwner = user?.id === company.owner_id;

  return (
    <AppShell>
      <ScreenHeader title={company.name} back />
      <main className="space-y-4 px-4">
        {editing && user ? (
          <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <h2 className="mb-3 text-sm font-semibold">Edit company page</h2>
            <CompanyForm
              userId={user.id}
              company={company}
              saving={save.isPending}
              onSubmit={(input) => save.mutate(input)}
              onCancel={() => setEditing(false)}
            />
          </section>
        ) : (
          <>
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              {company.cover_url ? (
                <img src={company.cover_url} alt={`${company.name} cover`} className="h-32 w-full object-cover" />
              ) : (
                <div className="surface-hero h-32 w-full" />
              )}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {company.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt={`${company.name} logo`}
                      className="-mt-12 size-16 shrink-0 rounded-2xl border-2 border-card object-cover"
                    />
                  ) : (
                    <span className="-mt-12 flex size-16 shrink-0 items-center justify-center rounded-2xl border-2 border-card bg-primary/10 text-base font-bold text-primary">
                      {initials(company.name)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <h1 className="truncate text-base font-semibold">{company.name}</h1>
                    {company.tagline ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{company.tagline}</p>
                    ) : null}
                  </div>
                  {isOwner ? (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditing(true)}>
                      <PencilSimple size={14} /> Edit
                    </Button>
                  ) : null}
                </div>

                <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                  {company.industry ? (
                    <li className="flex items-center gap-2">
                      <Buildings size={14} /> {company.industry}
                    </li>
                  ) : null}
                  <li className="flex items-center gap-2">
                    <MapPin size={14} /> {company.location ?? "Africa"}
                  </li>
                  {company.company_size ? (
                    <li className="flex items-center gap-2">
                      <UsersThree size={14} /> {company.company_size} people
                    </li>
                  ) : null}
                  {company.website ? (
                    <li className="flex items-center gap-2">
                      <Globe size={14} />
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="truncate font-semibold text-primary"
                      >
                        {company.website.replace(/^https?:\/\//, "")}
                      </a>
                    </li>
                  ) : null}
                </ul>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <h2 className="text-sm font-semibold">About</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {company.about ?? "This company has not added an about section yet."}
              </p>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Briefcase size={16} /> Open roles ({jobs.length})
                </h2>
                {isOwner ? (
                  <Link to="/gigs" className="text-xs font-semibold text-primary">
                    Post a role
                  </Link>
                ) : null}
              </div>
              {jobs.length ? (
                jobs.map((job) => <OpportunityCard key={job.id} opportunity={job} />)
              ) : (
                <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                  No open roles from {company.name} right now.
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </AppShell>
  );
}
