import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle, Trophy } from "@phosphor-icons/react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { ASSESSMENT_QUESTIONS, levelForScore } from "@/lib/afrixa";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assessment")({
  head: () => ({
    meta: [
      { title: "Skills assessment — Afrixa" },
      {
        name: "description",
        content: "Complete an Afrixa skills assessment and save a verified score to your talent profile.",
      },
      { property: "og:title", content: "Skills assessment — Afrixa" },
      {
        property: "og:description",
        content: "Earn a skills badge for your Afrixa profile through a short assessment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssessmentPage,
});

function AssessmentPage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [savedScore, setSavedScore] = useState<number | null>(null);

  const answered = Object.keys(answers).length;
  const complete = answered === ASSESSMENT_QUESTIONS.length;
  const score = Math.round(
    (ASSESSMENT_QUESTIONS.filter((question, index) => answers[index] === question.answer).length /
      ASSESSMENT_QUESTIONS.length) *
      100,
  );
  const visibleScore = savedScore ?? score;

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!complete) throw new Error("Answer every question before submitting");
      const { error } = await supabase.from("assessments").insert({
        user_id: user.id,
        skill: profile?.primary_skill ?? "General freelancing",
        score,
        level: levelForScore(score),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSavedScore(score);
      queryClient.invalidateQueries({ queryKey: ["assessments", user?.id] });
      toast.success("Assessment saved to your profile");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save score"),
  });

  return (
    <AppShell>
      <ScreenHeader title="Assessment" subtitle={profile?.primary_skill ?? "General skills"} back />
      <main className="space-y-5 px-4">
        <section className="surface-hero rounded-2xl p-5 text-primary-foreground shadow-lift">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-primary-foreground/70">Progress</p>
              <p className="mt-1 text-2xl font-bold">
                {answered}/{ASSESSMENT_QUESTIONS.length} answered
              </p>
            </div>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15">
              <Trophy size={24} weight="bold" />
            </span>
          </div>
          <Progress value={(answered / ASSESSMENT_QUESTIONS.length) * 100} className="mt-5 h-2" />
        </section>

        {savedScore !== null ? (
          <section className="rounded-2xl border border-border bg-card p-5 text-center shadow-card">
            <CheckCircle size={34} weight="fill" className="mx-auto text-secondary" />
            <h2 className="mt-3 text-lg font-bold">{levelForScore(visibleScore)}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Score saved: {visibleScore}%</p>
          </section>
        ) : null}

        <section className="space-y-4">
          {ASSESSMENT_QUESTIONS.map((question, index) => (
            <article key={question.question} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <h2 className="text-sm font-semibold leading-snug">{index + 1}. {question.question}</h2>
              <div className="mt-3 space-y-2">
                {question.options.map((option, optionIndex) => (
                  <Button
                    key={option}
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-auto min-h-11 w-full justify-start whitespace-normal bg-background px-3 py-2 text-left text-sm",
                      answers[index] === optionIndex && "border-secondary bg-secondary/10 text-secondary",
                    )}
                    onClick={() => setAnswers((current) => ({ ...current, [index]: optionIndex }))}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </article>
          ))}
        </section>

        <Button className="h-12 w-full" disabled={!complete || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : "Submit assessment"}
        </Button>
      </main>
    </AppShell>
  );
}