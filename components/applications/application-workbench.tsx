"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, FileText, MessageSquare, RefreshCw, Send, ShieldCheck, Sparkles, XCircle, ArrowUpRight } from "lucide-react";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { Badge } from "@/components/ui/badge";
import { DocumentRecord, RiskScoreResult, UnderwritingApplication, WorkflowDecision } from "@/lib/domain";
import { cn, formatCurrency } from "@/lib/utils";

type Explanation = {
  narrative: string;
  highlights: string[];
  source: string;
};
type RealtimeScoreResult = RiskScoreResult & {
  sources?: Array<{ name: string; score: number; weight: number; confidence?: string; summary?: string }>;
  modelVersion?: string;
};

type Props = {
  application: UnderwritingApplication;
  initialScore: RealtimeScoreResult;
  initialDecision: WorkflowDecision;
  initialExplanation: Explanation;
};

type TabKey = "overview" | "documents" | "actions";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "documents", label: "Documents" },
  { key: "actions", label: "Actions" },
];

function getDecisionTone(decision: WorkflowDecision["status"]) {
  if (decision === "approve") return "success" as const;
  if (decision === "review") return "warning" as const;
  return "danger" as const;
}

function getDocumentTone(document: DocumentRecord) {
  if (document.extractionStatus === "failed") return "danger" as const;
  if (document.extractionStatus === "complete") return "success" as const;
  return "warning" as const;
}

export function ApplicationWorkbench({ application, initialScore, initialDecision, initialExplanation }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [score, setScore] = useState(initialScore);
  const [decision, setDecision] = useState(initialDecision);
  const [explanation, setExplanation] = useState(initialExplanation);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [actionHistory, setActionHistory] = useState<Array<{ action: string; timestamp: string; actor: string; notes: string | null }>>([]);
  const [isPending, startTransition] = useTransition();

  const metrics = useMemo(() => {
    const debtRatio = Math.round((application.monthlyDebt / Math.max(application.annualIncome / 12, 1)) * 100);
    const verifiedDocuments = application.documents.filter((document) => document.status === "verified").length;

    return [
      { label: "Credit score", value: application.creditScore.toString(), note: "Bureau-grade signal" },
      { label: "Debt ratio", value: `${debtRatio}%`, note: "Monthly debt vs income" },
      { label: "Verified docs", value: verifiedDocuments.toString(), note: "Evidence verified" },
      { label: "Employment", value: `${application.employmentMonths} mo`, note: "Continuous history" },
    ];
  }, [application]);

  function runAction(kind: "score" | "decision" | "explanation") {
    setError(null);
    setSuccess(null);
    setPendingAction(kind);

    startTransition(async () => {
      try {
        const endpoint =
          kind === "score"
            ? `/api/v1/applications/${application.id}/score`
            : kind === "decision"
              ? `/api/v1/applications/${application.id}/decision`
              : `/api/v1/applications/${application.id}/explanation`;

        const response = await fetch(endpoint, { method: kind === "explanation" ? "GET" : "POST" });
        const text = await response.text();
        const body = text ? JSON.parse(text) : {};

        if (!response.ok) {
          throw new Error(body.error?.message ?? `Unable to refresh ${kind}.`);
        }

        if (kind === "score") setScore(body.data);
        else if (kind === "decision") setDecision(body.data);
        else setExplanation(body.data);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : `Unable to refresh ${kind}.`);
      } finally {
        setPendingAction(null);
      }
    });
  }

  function runUnderwriterAction(action: "approve" | "reject" | "request_docs" | "escalate") {
    setError(null);
    setSuccess(null);
    setPendingAction(action);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/v1/applications/${application.id}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, notes: actionNotes || undefined }),
        });

        const text = await response.text();
        const body = text ? JSON.parse(text) : {};

        if (!response.ok) {
          throw new Error(body.error?.message ?? `Unable to perform ${action}.`);
        }

        const result = body.data;
        setActionHistory((prev) => [
          { action: result.action, timestamp: result.timestamp, actor: result.actor, notes: result.notes },
          ...prev,
        ]);

        const decisionMap: Record<string, WorkflowDecision["status"]> = {
          approve: "approve",
          reject: "reject",
          request_docs: "review",
          escalate: "review",
        };

        setDecision((prev) => ({
          ...prev,
          status: decisionMap[action] ?? prev.status,
          rationale: result.notes || `Manual ${action} by ${result.actor}`,
        }));

        setActionNotes("");
        setSuccess(`Application ${action === "approve" ? "approved" : action === "reject" ? "rejected" : action === "request_docs" ? "sent back for additional documents" : "escalated"} successfully.`);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : `Unable to perform ${action}.`);
      } finally {
        setPendingAction(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="card-elevated p-4">
            <p className="text-xs font-medium text-muted">{metric.label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{metric.value}</p>
            <p className="mt-0.5 text-[11px] text-muted">{metric.note}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="card-elevated overflow-hidden">
          <div className="border-b border-line-subtle px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">Workbench</p>
                <h2 className="mt-1 text-base font-semibold text-foreground sm:text-lg">Live underwriting context</h2>
                <p className="mt-1 text-sm text-muted">Refresh score outputs, inspect evidence, and take underwriter actions.</p>
              </div>
              <div className="flex gap-1.5">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "rounded-lg px-3 py-2 text-xs font-medium transition min-h-[40px]",
                      activeTab === tab.key
                        ? "bg-accent-light text-accent"
                        : "text-muted hover:bg-surface-dim hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => runAction("score")} disabled={isPending} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-medium text-muted transition min-h-[40px] hover:text-foreground disabled:opacity-60">
                <RefreshCw className={cn("h-3.5 w-3.5", pendingAction === "score" ? "animate-spin" : "")} />
                Refresh score
              </button>
              <button type="button" onClick={() => runAction("decision")} disabled={isPending} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-medium text-muted transition min-h-[40px] hover:text-foreground disabled:opacity-60">
                <ShieldCheck className="h-3.5 w-3.5" />
                Refresh decision
              </button>
              <button type="button" onClick={() => runAction("explanation")} disabled={isPending} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-medium text-muted transition min-h-[40px] hover:text-foreground disabled:opacity-60">
                <Sparkles className="h-3.5 w-3.5" />
                Refresh narrative
              </button>
            </div>

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-light px-3 py-2 text-xs text-danger">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <p>{error}</p>
              </div>
            )}
            {success && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-success/20 bg-success-light px-3 py-2 text-xs text-success">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
                <p>{success}</p>
              </div>
            )}
          </div>

          <div className="p-6">
            {activeTab === "overview" && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-line-subtle p-4">
                    <p className="text-xs font-medium text-muted">Composite score</p>
                    <p className="mt-2 font-mono text-4xl font-bold text-foreground">{score.totalScore}</p>
                    <p className="mt-2 text-xs leading-5 text-muted">{score.summary}</p>
                  </div>
                  <div className="rounded-xl border border-line-subtle p-4">
                    <p className="text-xs font-medium text-muted">Recommendation</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone={getDecisionTone(decision.status)}>{decision.status}</Badge>
                      <Badge tone="neutral">Model {application.modelVersion}</Badge>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted">{decision.rationale}</p>
                    <div className="mt-3 rounded-lg bg-surface-dim px-3 py-2">
                      <p className="text-[11px] font-medium text-muted">Model version</p>
                      <p className="text-xs text-foreground">{score.modelVersion}</p>
                    </div>
                  </div>
                </div>

                {score.sources && score.sources.length > 0 && (
                  <div className="rounded-xl border border-line-subtle p-4">
                    <p className="text-xs font-medium text-muted">Signal sources</p>
                    <div className="mt-3 space-y-2">
                      {score.sources.map((source) => (
                        <div key={source.name} className="flex items-center justify-between text-xs">
                          <span className="text-foreground">{source.name}</span>
                          <span className="font-mono text-muted">{source.score}/{source.weight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {score.factors.map((factor) => (
                    <div key={factor.name} className="rounded-xl border border-line-subtle p-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{factor.name}</span>
                        <span className="font-mono text-muted">{factor.score}/{factor.maxScore}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-dim">
                        <div className="metric-bar h-full" style={{ width: `${(factor.score / factor.maxScore) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "documents" && (
              <div className="space-y-5">
                <DocumentUploadForm applicationId={application.id} />
                <div className="space-y-2">
                  {application.documents.length ? (
                    application.documents.map((document) => (
                      <div key={document.id} className="rounded-xl border border-line-subtle p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <FileText className="h-4 w-4 text-accent" />
                            <div>
                              <p className="text-sm font-medium text-foreground">{document.name}</p>
                              <p className="text-[11px] font-medium text-muted">{document.type}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge tone={document.status === "verified" ? "success" : "warning"}>{document.status}</Badge>
                            <Badge tone={getDocumentTone(document)}>{document.extractionStatus ?? "pending"}</Badge>
                            <a
                              href={`/api/v1/applications/${application.id}/documents/${document.id}/view`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-muted transition min-h-[36px] hover:text-foreground"
                            >
                              View
                            </a>
                          </div>
                        </div>
                        {document.extractionSummary && (
                          <p className="mt-2 text-xs leading-5 text-muted">{document.extractionSummary}</p>
                        )}
                        {document.extractedText && (
                          <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted">{document.extractedText}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
                      No documents uploaded yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "actions" && (
              <div className="space-y-5">
                <div className="rounded-xl border border-line-subtle p-4">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="mt-0.5 h-4 w-4 text-accent" />
                    <p className="text-sm leading-6 text-foreground">{explanation.narrative}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {explanation.highlights.map((item) => (
                      <Badge key={item} tone="neutral">{item}</Badge>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] font-medium text-muted">Source: {explanation.source}</p>
                </div>

                <div className="rounded-xl border border-accent/20 bg-accent-light/30 p-5">
                  <p className="text-sm font-semibold text-foreground">Underwriter decision</p>
                  <p className="mt-1 text-xs text-muted">Take a final action on this application. Add optional notes for the audit trail.</p>

                  <div className="mt-4">
                    <textarea
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      placeholder="Add notes for the audit trail (optional)..."
                      rows={3}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    <button
                      type="button"
                      onClick={() => runUnderwriterAction("approve")}
                      disabled={isPending}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition min-h-[44px] hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {pendingAction === "approve" ? "Approving..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={() => runUnderwriterAction("reject")}
                      disabled={isPending}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition min-h-[44px] hover:bg-red-700 disabled:opacity-60"
                    >
                      <XCircle className="h-4 w-4" />
                      {pendingAction === "reject" ? "Rejecting..." : "Reject"}
                    </button>
                    <button
                      type="button"
                      onClick={() => runUnderwriterAction("request_docs")}
                      disabled={isPending}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition min-h-[44px] hover:bg-surface-dim disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" />
                      {pendingAction === "request_docs" ? "Sending..." : "Request docs"}
                    </button>
                    <button
                      type="button"
                      onClick={() => runUnderwriterAction("escalate")}
                      disabled={isPending}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition min-h-[44px] hover:bg-surface-dim disabled:opacity-60"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      {pendingAction === "escalate" ? "Escalating..." : "Escalate"}
                    </button>
                  </div>
                </div>

                {actionHistory.length > 0 && (
                  <div className="rounded-xl border border-line-subtle p-4">
                    <p className="mb-3 text-xs font-medium text-muted">Action history (this session)</p>
                    <div className="space-y-2">
                      {actionHistory.map((entry, i) => (
                        <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-dim px-3 py-2 text-xs">
                          <div className="flex items-center gap-2">
                            <Badge tone={entry.action === "approve" ? "success" : entry.action === "reject" ? "danger" : "warning"}>
                              {entry.action}
                            </Badge>
                            {entry.notes && <span className="text-muted">{entry.notes}</span>}
                          </div>
                          <span className="text-muted">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {decision.nextActions.map((action) => (
                    <div key={action} className="rounded-lg border border-line-subtle bg-surface-dim px-4 py-3 text-sm text-foreground">
                      {action}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-elevated overflow-hidden">
            <div className="border-b border-line-subtle px-6 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">Borrower snapshot</p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">Core exposure</h3>
            </div>
            <div className="divide-y divide-line-subtle">
              {[
                { label: "Requested amount", value: `$${formatCurrency(application.requestedAmount)}` },
                { label: "Annual income", value: `$${formatCurrency(application.annualIncome)}` },
                { label: "Monthly debt", value: `$${formatCurrency(application.monthlyDebt)}` },
                { label: "Submitted", value: application.submittedAt },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-6 py-3 text-sm">
                  <span className="text-muted">{row.label}</span>
                  <span className="font-mono font-medium text-foreground">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-elevated overflow-hidden">
            <div className="border-b border-line-subtle px-6 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">Operator notes</p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">Pressure points</h3>
            </div>
            <div className="p-6">
              <div className="space-y-2">
                {application.flags.length ? (
                  application.flags.map((flag) => (
                    <div key={flag} className="rounded-lg border border-warning/20 bg-warning-light px-4 py-2.5 text-sm text-warning">
                      {flag}
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-success/20 bg-success-light px-4 py-2.5 text-sm text-success">
                    No active risk flags attached.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
