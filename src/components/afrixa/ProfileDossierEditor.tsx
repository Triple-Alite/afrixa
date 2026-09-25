import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Certificate, GraduationCap, Plus, Sparkle, Trash, X } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  addCertification,
  addEducation,
  addExperience,
  announcePosition,
  addSkill,
  deleteDossierRow,
  fetchProfileDossier,
  monthYear,
  skillPercent,
  SKILL_LEVELS,
  updateHourlyRate,
  type DossierTable,
  type SkillLevel,
} from "@/lib/profile.data";
import { cn } from "@/lib/utils";

type Form = "skill" | "experience" | "education" | "certification" | null;

export function ProfileDossierEditor({
  userId,
  hourlyRate,
  onRateSaved,
}: {
  userId: string;
  hourlyRate: number | null;
  onRateSaved?: () => void;
}) {
  const queryClient = useQueryClient();
  const [openForm, setOpenForm] = useState<Form>(null);
  const [rate, setRate] = useState(hourlyRate ? String(hourlyRate) : "");

  const { data: dossier } = useQuery({
    queryKey: ["dossier", userId],
    queryFn: () => fetchProfileDossier(userId),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["dossier", userId] });
  }

  const remove = useMutation({
    mutationFn: ({ table, id }: { table: DossierTable; id: string }) =>
      deleteDossierRow(table, id),
    onSuccess: () => {
      refresh();
      toast.success("Removed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveRate = useMutation({
    mutationFn: () => updateHourlyRate(userId, rate ? Number(rate) : null),
    onSuccess: () => {
      onRateSaved?.();
      toast.success("Hourly rate saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Skill form
  const [skillName, setSkillName] = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("intermediate");
  const [skillYears, setSkillYears] = useState("");
  const createSkill = useMutation({
    mutationFn: () =>
      addSkill(userId, {
        name: skillName.trim(),
        level: skillLevel,
        years: skillYears ? Number(skillYears) : null,
      }),
    onSuccess: () => {
      setSkillName("");
      setSkillYears("");
      setOpenForm(null);
      refresh();
      toast.success("Skill added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Experience form
  const [job, setJob] = useState({
    title: "",
    company: "",
    location: "",
    start_date: "",
    end_date: "",
    summary: "",
  });
  const [current, setCurrent] = useState(false);
  const [shareJob, setShareJob] = useState(true);
  const [updateHeadline, setUpdateHeadline] = useState(true);
  const createJob = useMutation({
    mutationFn: async () => {
      const payload = {
        title: job.title.trim(),
        company: job.company.trim(),
        summary: job.summary.trim() || null,
        is_current: current,
      };
      await addExperience(userId, {
        title: job.title.trim(),
        company: job.company.trim(),
        location: job.location.trim() || null,
        start_date: job.start_date,
        end_date: job.end_date || null,
        is_current: current,
        summary: job.summary.trim() || null,
      });
      await announcePosition(userId, payload, {
        share: shareJob,
        updateHeadline: current && updateHeadline,
      });
      return shareJob;
    },
    onSuccess: (shared) => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setJob({ title: "", company: "", location: "", start_date: "", end_date: "", summary: "" });
      setCurrent(false);
      setOpenForm(null);
      refresh();
      toast.success(shared ? "Position added and shared with your network" : "Position added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Education form
  const [school, setSchool] = useState({
    school: "",
    qualification: "",
    field_of_study: "",
    start_year: "",
    end_year: "",
  });
  const createSchool = useMutation({
    mutationFn: () =>
      addEducation(userId, {
        school: school.school.trim(),
        qualification: school.qualification.trim() || null,
        field_of_study: school.field_of_study.trim() || null,
        start_year: school.start_year ? Number(school.start_year) : null,
        end_year: school.end_year ? Number(school.end_year) : null,
      }),
    onSuccess: () => {
      setSchool({ school: "", qualification: "", field_of_study: "", start_year: "", end_year: "" });
      setOpenForm(null);
      refresh();
      toast.success("Education added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Certification form
  const [cert, setCert] = useState({
    name: "",
    issuer: "",
    issue_date: "",
    expiry_date: "",
    credential_url: "",
  });
  const createCert = useMutation({
    mutationFn: () =>
      addCertification(userId, {
        name: cert.name.trim(),
        issuer: cert.issuer.trim(),
        issue_date: cert.issue_date || null,
        expiry_date: cert.expiry_date || null,
        credential_url: cert.credential_url.trim() || null,
      }),
    onSuccess: () => {
      setCert({ name: "", issuer: "", issue_date: "", expiry_date: "", credential_url: "" });
      setOpenForm(null);
      refresh();
      toast.success("Certification added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const input = "h-11 rounded-xl";

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <h2 className="text-base font-semibold">Hourly rate</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Shown on your public profile so clients know your starting price.
        </p>
        <div className="mt-3 flex gap-2">
          <Input
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            placeholder="e.g. 35"
            inputMode="decimal"
            aria-label="Hourly rate in USD"
            className={input}
          />
          <Button className="h-11" disabled={saveRate.isPending} onClick={() => saveRate.mutate()}>
            Save
          </Button>
        </div>
      </section>

      {/* Skills */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <SectionHeader
          icon={<Sparkle size={18} className="text-secondary" />}
          title="Skills"
          open={openForm === "skill"}
          onToggle={() => setOpenForm(openForm === "skill" ? null : "skill")}
        />
        <div className="mt-3 space-y-3">
          {dossier?.skills.length ? (
            dossier.skills.map((skill) => (
              <div key={skill.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium">{skill.name}</span>
                    <span className="text-xs capitalize text-muted-foreground">
                      {skill.level}
                      {skill.years ? ` · ${skill.years} yr` : ""}
                    </span>
                  </div>
                  <Progress value={skillPercent(skill.level)} className="mt-1.5 h-1.5" />
                </div>
                <RemoveButton
                  onClick={() => remove.mutate({ table: "profile_skills", id: skill.id })}
                  label={`Remove ${skill.name}`}
                />
              </div>
            ))
          ) : (
            <Empty text="Add the skills you want to be hired for." />
          )}

          {openForm === "skill" ? (
            <div className="space-y-2 rounded-xl border border-border p-3">
              <Input
                value={skillName}
                onChange={(event) => setSkillName(event.target.value)}
                placeholder="Skill (e.g. Brand design)"
                className={input}
              />
              <div className="flex flex-wrap gap-1.5">
                {SKILL_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setSkillLevel(level.value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium",
                      skillLevel === level.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border",
                    )}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
              <Input
                value={skillYears}
                onChange={(event) => setSkillYears(event.target.value)}
                placeholder="Years of experience (optional)"
                inputMode="decimal"
                className={input}
              />
              <Button
                className="h-11 w-full"
                disabled={!skillName.trim() || createSkill.isPending}
                onClick={() => createSkill.mutate()}
              >
                Add skill
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      {/* Experience */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <SectionHeader
          icon={<Briefcase size={18} className="text-primary" />}
          title="Experience"
          open={openForm === "experience"}
          onToggle={() => setOpenForm(openForm === "experience" ? null : "experience")}
        />
        <div className="mt-3 space-y-3">
          {dossier?.experience.length ? (
            dossier.experience.map((row) => (
              <div key={row.id} className="flex items-start gap-3 border-l-2 border-border pl-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">{row.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {row.company}
                    {row.location ? ` · ${row.location}` : ""}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {monthYear(row.start_date)} —{" "}
                    {row.is_current ? "Present" : monthYear(row.end_date)}
                  </p>
                  {row.summary ? (
                    <p className="mt-1 text-xs text-muted-foreground">{row.summary}</p>
                  ) : null}
                </div>
                <RemoveButton
                  onClick={() => remove.mutate({ table: "work_experiences", id: row.id })}
                  label={`Remove ${row.title}`}
                />
              </div>
            ))
          ) : (
            <Empty text="Add the roles and clients you've worked with." />
          )}

          {openForm === "experience" ? (
            <div className="space-y-2 rounded-xl border border-border p-3">
              <Input
                value={job.title}
                onChange={(event) => setJob((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Role title"
                className={input}
              />
              <Input
                value={job.company}
                onChange={(event) => setJob((prev) => ({ ...prev, company: event.target.value }))}
                placeholder="Company or client"
                className={input}
              />
              <Input
                value={job.location}
                onChange={(event) => setJob((prev) => ({ ...prev, location: event.target.value }))}
                placeholder="Location (optional)"
                className={input}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={job.start_date}
                  onChange={(event) =>
                    setJob((prev) => ({ ...prev, start_date: event.target.value }))
                  }
                  type="date"
                  aria-label="Start date"
                  className={input}
                />
                <Input
                  value={job.end_date}
                  onChange={(event) => setJob((prev) => ({ ...prev, end_date: event.target.value }))}
                  type="date"
                  aria-label="End date"
                  disabled={current}
                  className={input}
                />
              </div>
              <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                I currently work here
                <Switch checked={current} onCheckedChange={setCurrent} />
              </label>
              {current ? (
                <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm">
                  <span>
                    Update my headline
                    <span className="block text-[11px] text-muted-foreground">
                      {job.title && job.company ? `${job.title} at ${job.company}` : "Uses this role title and company"}
                    </span>
                  </span>
                  <Switch checked={updateHeadline} onCheckedChange={setUpdateHeadline} />
                </label>
              ) : null}
              <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm">
                <span>
                  Share with your network
                  <span className="block text-[11px] text-muted-foreground">
                    Posts this update to the Network feed so people can congratulate you
                  </span>
                </span>
                <Switch checked={shareJob} onCheckedChange={setShareJob} />
              </label>
              <Textarea
                value={job.summary}
                onChange={(event) => setJob((prev) => ({ ...prev, summary: event.target.value }))}
                placeholder="What did you deliver? (optional)"
                rows={3}
              />
              <Button
                className="h-11 w-full"
                disabled={
                  !job.title.trim() || !job.company.trim() || !job.start_date || createJob.isPending
                }
                onClick={() => createJob.mutate()}
              >
                {createJob.isPending ? "Saving…" : shareJob ? "Save and share position" : "Save position"}
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      {/* Education */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <SectionHeader
          icon={<GraduationCap size={18} className="text-primary" />}
          title="Education"
          open={openForm === "education"}
          onToggle={() => setOpenForm(openForm === "education" ? null : "education")}
        />
        <div className="mt-3 space-y-3">
          {dossier?.education.length ? (
            dossier.education.map((row) => (
              <div key={row.id} className="flex items-start gap-3 border-l-2 border-border pl-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">{row.school}</h3>
                  <p className="text-xs text-muted-foreground">
                    {[row.qualification, row.field_of_study].filter(Boolean).join(" · ") ||
                      "Studied here"}
                  </p>
                  {row.start_year || row.end_year ? (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {row.start_year ?? "—"} — {row.end_year ?? "Present"}
                    </p>
                  ) : null}
                </div>
                <RemoveButton
                  onClick={() => remove.mutate({ table: "education_entries", id: row.id })}
                  label={`Remove ${row.school}`}
                />
              </div>
            ))
          ) : (
            <Empty text="Add your school, degree or training." />
          )}

          {openForm === "education" ? (
            <div className="space-y-2 rounded-xl border border-border p-3">
              <Input
                value={school.school}
                onChange={(event) =>
                  setSchool((prev) => ({ ...prev, school: event.target.value }))
                }
                placeholder="School or institution"
                className={input}
              />
              <Input
                value={school.qualification}
                onChange={(event) =>
                  setSchool((prev) => ({ ...prev, qualification: event.target.value }))
                }
                placeholder="Qualification (e.g. BSc)"
                className={input}
              />
              <Input
                value={school.field_of_study}
                onChange={(event) =>
                  setSchool((prev) => ({ ...prev, field_of_study: event.target.value }))
                }
                placeholder="Field of study"
                className={input}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={school.start_year}
                  onChange={(event) =>
                    setSchool((prev) => ({ ...prev, start_year: event.target.value }))
                  }
                  placeholder="Start year"
                  inputMode="numeric"
                  className={input}
                />
                <Input
                  value={school.end_year}
                  onChange={(event) =>
                    setSchool((prev) => ({ ...prev, end_year: event.target.value }))
                  }
                  placeholder="End year"
                  inputMode="numeric"
                  className={input}
                />
              </div>
              <Button
                className="h-11 w-full"
                disabled={!school.school.trim() || createSchool.isPending}
                onClick={() => createSchool.mutate()}
              >
                Add education
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      {/* Certifications */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <SectionHeader
          icon={<Certificate size={18} className="text-secondary" />}
          title="Certifications"
          open={openForm === "certification"}
          onToggle={() => setOpenForm(openForm === "certification" ? null : "certification")}
        />
        <div className="mt-3 space-y-3">
          {dossier?.certifications.length ? (
            dossier.certifications.map((row) => (
              <div key={row.id} className="flex items-start gap-3 border-l-2 border-border pl-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">{row.name}</h3>
                  <p className="text-xs text-muted-foreground">{row.issuer}</p>
                  {row.issue_date ? (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Issued {monthYear(row.issue_date)}
                    </p>
                  ) : null}
                </div>
                <RemoveButton
                  onClick={() => remove.mutate({ table: "certifications", id: row.id })}
                  label={`Remove ${row.name}`}
                />
              </div>
            ))
          ) : (
            <Empty text="Add certificates that prove your skills." />
          )}

          {openForm === "certification" ? (
            <div className="space-y-2 rounded-xl border border-border p-3">
              <Input
                value={cert.name}
                onChange={(event) => setCert((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Certificate name"
                className={input}
              />
              <Input
                value={cert.issuer}
                onChange={(event) => setCert((prev) => ({ ...prev, issuer: event.target.value }))}
                placeholder="Issued by"
                className={input}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={cert.issue_date}
                  onChange={(event) =>
                    setCert((prev) => ({ ...prev, issue_date: event.target.value }))
                  }
                  type="date"
                  aria-label="Issue date"
                  className={input}
                />
                <Input
                  value={cert.expiry_date}
                  onChange={(event) =>
                    setCert((prev) => ({ ...prev, expiry_date: event.target.value }))
                  }
                  type="date"
                  aria-label="Expiry date"
                  className={input}
                />
              </div>
              <Input
                value={cert.credential_url}
                onChange={(event) =>
                  setCert((prev) => ({ ...prev, credential_url: event.target.value }))
                }
                placeholder="Credential link (optional)"
                inputMode="url"
                className={input}
              />
              <Button
                className="h-11 w-full"
                disabled={!cert.name.trim() || !cert.issuer.trim() || createCert.isPending}
                onClick={() => createCert.mutate()}
              >
                Add certification
              </Button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  open,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        {icon} {title}
      </h2>
      <Button variant="ghost" size="icon" aria-label={open ? `Close ${title} form` : `Add ${title}`} onClick={onToggle}>
        {open ? <X size={18} /> : <Plus size={18} />}
      </Button>
    </div>
  );
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground"
    >
      <Trash size={14} />
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground">{text}</p>;
}
