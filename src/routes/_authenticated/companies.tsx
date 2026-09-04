import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Buildings, MagnifyingGlass, MapPin, Plus } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { CompanyForm } from "@/components/afrixa/CompanyForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { initials } from "@/lib/afrixa";
import { createCompany, fetchCompanies, fetchMyCompany, type CompanyInput } from "@/lib/companies.data";

export const Route = createFileRoute("/_authenticated/companies")({
  head: () => ({
    meta: [
      { title: "Company directory — Afrixa" },
      {
        name: "description",
        content: "Browse companies hiring on Afrixa by industry and location, and open their pages to see live roles.",
      },
      { property: "og:title", content: "Company directory — Afrixa" },
      { property: "og:description", content: "Discover African companies hiring talent on Afrixa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompanyDirectory,
});

function CompanyDirectory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
  });

  const { data: myCompany } = useQuery({
    queryKey: ["my-company", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => fetchMyCompany(user!.id),
  });

  const create = useMutation({
    mutationFn: (input: CompanyInput) => createCompany(user!.id, input),
    onSuccess: async (company) => {
      toast.success("Company page created");
      setCreating(false);
      await queryClient.invalidateQueries({ queryKey: ["companies"] });
      await queryClient.invalidateQueries({ queryKey: ["my-company", user?.id] });
      void company;
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not create page"),
  });

  const query = term.trim().toLowerCase();
  const results = query
    ? companies.filter((company) =>
        [company.name, company.industry, company.location, company.tagline]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query)),
      )
    : companies;

  return (
    <AppShell>
      <ScreenHeader title="Companies" subtitle="Teams hiring on Afrixa" back />
      <main className="space-y-4 px-4">
        <div className="relative">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search company, industry or city"
            className="h-12 rounded-xl pl-10"
          />
        </div>

        {myCompany ? (
          <Link
            to="/companies/$slug"
            params={{ slug: myCompany.slug }}
            className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-sm shadow-card"
          >
            <span>
              <span className="font-semibold">{myCompany.name}</span>
              <span className="block text-xs text-muted-foreground">Your company page</span>
            </span>
            <span className="text-xs font-semibold text-primary">Manage</span>
          </Link>
        ) : creating && user ? (
          <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <h2 className="mb-3 text-sm font-semibold">Create your company page</h2>
            <CompanyForm
              userId={user.id}
              saving={create.isPending}
              onSubmit={(input) => create.mutate(input)}
              onCancel={() => setCreating(false)}
            />
          </section>
        ) : (
          <Button variant="outline" className="w-full gap-2" onClick={() => setCreating(true)}>
            <Plus size={16} /> Create a company page
          </Button>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading companies…</p>
        ) : results.length ? (
          <div className="space-y-3">
            {results.map((company) => (
              <Link
                key={company.id}
                to="/companies/$slug"
                params={{ slug: company.slug }}
                className="block overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-lift"
              >
                {company.cover_url ? (
                  <img src={company.cover_url} alt={`${company.name} cover`} className="h-20 w-full object-cover" />
                ) : (
                  <div className="surface-hero h-20 w-full" />
                )}
                <div className="flex items-start gap-3 p-4">
                  {company.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt={`${company.name} logo`}
                      className="-mt-8 size-12 shrink-0 rounded-xl border-2 border-card object-cover"
                    />
                  ) : (
                    <span className="-mt-8 flex size-12 shrink-0 items-center justify-center rounded-xl border-2 border-card bg-primary/10 text-sm font-bold text-primary">
                      {initials(company.name)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-semibold">{company.name}</h2>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {company.tagline ?? company.industry ?? "Company on Afrixa"}
                    </p>
                    <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin size={12} /> {company.location ?? "Africa"}
                      {company.company_size ? ` · ${company.company_size} people` : ""}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            <Buildings size={18} /> No company matches that search yet.
          </p>
        )}
      </main>
    </AppShell>
  );
}
