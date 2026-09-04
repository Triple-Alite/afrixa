import { Briefcase, Certificate, GraduationCap, Sparkle } from "@phosphor-icons/react";

import { Progress } from "@/components/ui/progress";
import {
  monthYear,
  skillPercent,
  type ProfileDossier as Dossier,
} from "@/lib/profile.data";

function SectionShell({
  icon,
  title,
  children,
  empty,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  empty: boolean;
}) {
  if (empty) return null;
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        {icon} {title}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

/** Read-only rendering of skills, experience, education and certifications. */
export function ProfileDossierView({ dossier }: { dossier: Dossier }) {
  const { skills, experience, education, certifications } = dossier;

  return (
    <>
      <SectionShell
        icon={<Sparkle size={18} className="text-secondary" />}
        title="Skills"
        empty={skills.length === 0}
      >
        {skills.map((skill) => (
          <div key={skill.id}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{skill.name}</span>
              <span className="text-xs capitalize text-muted-foreground">
                {skill.level}
                {skill.years ? ` · ${skill.years} yr` : ""}
              </span>
            </div>
            <Progress value={skillPercent(skill.level)} className="mt-1.5 h-1.5" />
          </div>
        ))}
      </SectionShell>

      <SectionShell
        icon={<Briefcase size={18} className="text-primary" />}
        title="Experience"
        empty={experience.length === 0}
      >
        {experience.map((job) => (
          <article key={job.id} className="border-l-2 border-border pl-3">
            <h3 className="text-sm font-semibold">{job.title}</h3>
            <p className="text-xs text-muted-foreground">
              {job.company}
              {job.location ? ` · ${job.location}` : ""}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {monthYear(job.start_date)} — {job.is_current ? "Present" : monthYear(job.end_date)}
            </p>
            {job.summary ? <p className="mt-1 text-xs text-muted-foreground">{job.summary}</p> : null}
          </article>
        ))}
      </SectionShell>

      <SectionShell
        icon={<GraduationCap size={18} className="text-primary" />}
        title="Education"
        empty={education.length === 0}
      >
        {education.map((entry) => (
          <article key={entry.id} className="border-l-2 border-border pl-3">
            <h3 className="text-sm font-semibold">{entry.school}</h3>
            <p className="text-xs text-muted-foreground">
              {[entry.qualification, entry.field_of_study].filter(Boolean).join(" · ") ||
                "Studied here"}
            </p>
            {entry.start_year || entry.end_year ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {entry.start_year ?? "—"} — {entry.end_year ?? "Present"}
              </p>
            ) : null}
          </article>
        ))}
      </SectionShell>

      <SectionShell
        icon={<Certificate size={18} className="text-secondary" />}
        title="Certifications"
        empty={certifications.length === 0}
      >
        {certifications.map((cert) => (
          <article key={cert.id} className="border-l-2 border-border pl-3">
            <h3 className="text-sm font-semibold">{cert.name}</h3>
            <p className="text-xs text-muted-foreground">{cert.issuer}</p>
            {cert.issue_date ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Issued {monthYear(cert.issue_date)}
                {cert.expiry_date ? ` · expires ${monthYear(cert.expiry_date)}` : ""}
              </p>
            ) : null}
            {cert.credential_url ? (
              <a
                href={cert.credential_url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-1 block truncate text-xs font-semibold text-primary"
              >
                View credential
              </a>
            ) : null}
          </article>
        ))}
      </SectionShell>
    </>
  );
}
