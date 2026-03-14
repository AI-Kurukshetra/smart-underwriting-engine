"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const SAMPLE = {
  applicantName: "Avery Park",
  requestedAmount: 18000,
  annualIncome: 82000,
  creditScore: 695,
  employmentMonths: 42,
  monthlyDebt: 950,
};

type CreateResponse = {
  data?: {
    id: string;
    applicantName: string;
    decision: string;
    riskScore: number;
  };
  meta?: {
    persisted?: boolean;
  };
  error?: {
    message: string;
  };
};

export function ApplicationIntakeForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResponse["data"] | null>(null);
  const [persisted, setPersisted] = useState(false);
  const [autoOpen, setAutoOpen] = useState(true);

  function fillSample() {
    const form = formRef.current;
    if (!form) return;

    (form.elements.namedItem("applicantName") as HTMLInputElement).value = SAMPLE.applicantName;
    (form.elements.namedItem("requestedAmount") as HTMLInputElement).value = String(SAMPLE.requestedAmount);
    (form.elements.namedItem("annualIncome") as HTMLInputElement).value = String(SAMPLE.annualIncome);
    (form.elements.namedItem("creditScore") as HTMLInputElement).value = String(SAMPLE.creditScore);
    (form.elements.namedItem("employmentMonths") as HTMLInputElement).value = String(SAMPLE.employmentMonths);
    (form.elements.namedItem("monthlyDebt") as HTMLInputElement).value = String(SAMPLE.monthlyDebt);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      applicantName: String(formData.get("applicantName") || ""),
      requestedAmount: Number(formData.get("requestedAmount") || 0),
      annualIncome: Number(formData.get("annualIncome") || 0),
      creditScore: Number(formData.get("creditScore") || 0),
      employmentMonths: Number(formData.get("employmentMonths") || 0),
      monthlyDebt: Number(formData.get("monthlyDebt") || 0),
    };

    startTransition(async () => {
      try {
        const response = await fetch("/api/v1/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const text = await response.text();
        const body = text ? (JSON.parse(text) as CreateResponse) : {};

        if (!response.ok) {
          setError(body.error?.message ?? "Unable to create application.");
          return;
        }

        setResult(body.data ?? null);
        setPersisted(Boolean(body.meta?.persisted));
        form.reset();

        if (autoOpen && body.meta?.persisted && body.data?.id && body.data.id !== "draft-preview") {
          router.push(`/applications/${body.data.id}`);
          router.refresh();
          return;
        }

        router.refresh();
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : "Unable to create application.");
      }
    });
  }

  const inputClass =
    "w-full rounded-lg border border-line bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-foreground">Applicant name</span>
          <input name="applicantName" required className={inputClass} placeholder="Jordan Lee" />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-foreground">Requested amount</span>
          <input name="requestedAmount" type="number" required className={inputClass} placeholder="15000" />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-foreground">Annual income</span>
          <input name="annualIncome" type="number" required className={inputClass} placeholder="78000" />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-foreground">Credit score</span>
          <input name="creditScore" type="number" required className={inputClass} placeholder="710" />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-foreground">Employment months</span>
          <input name="employmentMonths" type="number" required className={inputClass} placeholder="36" />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-foreground">Monthly debt</span>
          <input name="monthlyDebt" type="number" required className={inputClass} placeholder="1200" />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Scoring application..." : "Create application"}
        </button>
        <button
          type="button"
          onClick={fillSample}
          className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface-dim"
        >
          Use sample data
        </button>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={autoOpen}
            onChange={(event) => setAutoOpen(event.target.checked)}
            className="h-4 w-4 rounded border-line accent-accent"
          />
          Open case after create
        </label>
      </div>

      {result ? (
        <div className="rounded-lg border border-success/20 bg-success-light px-4 py-3 text-sm text-success">
          {result.applicantName} scored {result.riskScore} with a {result.decision} recommendation.
          {persisted ? " Added to the live operating queue." : " Generated in preview mode."}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-danger/20 bg-danger-light px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}
    </form>
  );
}
