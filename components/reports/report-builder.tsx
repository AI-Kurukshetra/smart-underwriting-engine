"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import {
  BarChart3,
  CheckCircle2,
  Download,
  FileText,
  GripVertical,
  Hash,
  Layers,
  LayoutGrid,
  Loader2,
  PieChart,
  Plus,
  Save,
  Settings2,
  Table,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { saveReport } from "@/lib/api-client";

type WidgetType = "metric" | "bar_chart" | "pie_chart" | "table" | "trend_line" | "text_block";

type ReportWidget = {
  id: string;
  type: WidgetType;
  title: string;
  dataKey: string;
  size: "small" | "medium" | "large";
};

type ReportData = {
  metrics: Record<string, number>;
  decisions: { approved: number; review: number; rejected: number; pending: number };
  riskBuckets: Array<{ label: string; count: number; color: string }>;
  applicationRows: Array<{
    id: string;
    name: string;
    score: number;
    amount: number;
    decision: string;
    status: string;
    flags: number;
    docs: number;
  }>;
};

type Props = {
  data: ReportData;
};

const widgetCatalog: Array<{ type: WidgetType; label: string; icon: typeof BarChart3; description: string }> = [
  { type: "metric", label: "Metric Card", icon: Hash, description: "Single KPI value with label" },
  { type: "bar_chart", label: "Bar Chart", icon: BarChart3, description: "Visual comparison of categories" },
  { type: "pie_chart", label: "Pie Chart", icon: PieChart, description: "Proportional distribution view" },
  { type: "table", label: "Data Table", icon: Table, description: "Application data rows" },
  { type: "trend_line", label: "Trend Line", icon: TrendingUp, description: "Score distribution curve" },
  { type: "text_block", label: "Text Note", icon: FileText, description: "Annotation or summary note" },
];

const metricOptions: Array<{ key: string; label: string }> = [
  { key: "totalApplications", label: "Total Applications" },
  { key: "approvalRate", label: "Approval Rate (%)" },
  { key: "avgRiskScore", label: "Avg Risk Score" },
  { key: "totalExposure", label: "Total Exposure ($)" },
  { key: "totalDocuments", label: "Total Documents" },
  { key: "manualReviewRate", label: "Manual Review Rate (%)" },
  { key: "avgMonthlyDebt", label: "Avg Monthly Debt ($)" },
  { key: "avgAnnualIncome", label: "Avg Annual Income ($)" },
];

const templates = [
  {
    name: "Executive Summary",
    description: "KPIs, decision breakdown, and application table",
    widgets: [
      { type: "metric" as WidgetType, title: "Total Applications", dataKey: "totalApplications", size: "small" as const },
      { type: "metric" as WidgetType, title: "Approval Rate", dataKey: "approvalRate", size: "small" as const },
      { type: "metric" as WidgetType, title: "Avg Risk Score", dataKey: "avgRiskScore", size: "small" as const },
      { type: "metric" as WidgetType, title: "Total Exposure", dataKey: "totalExposure", size: "small" as const },
      { type: "pie_chart" as WidgetType, title: "Decision Distribution", dataKey: "decisions", size: "medium" as const },
      { type: "bar_chart" as WidgetType, title: "Risk Score Buckets", dataKey: "riskBuckets", size: "medium" as const },
      { type: "table" as WidgetType, title: "Application Queue", dataKey: "applications", size: "large" as const },
    ],
  },
  {
    name: "Risk Analysis",
    description: "Risk distribution, scoring, and high-risk cases",
    widgets: [
      { type: "metric" as WidgetType, title: "Avg Risk Score", dataKey: "avgRiskScore", size: "small" as const },
      { type: "metric" as WidgetType, title: "Manual Review Rate", dataKey: "manualReviewRate", size: "small" as const },
      { type: "bar_chart" as WidgetType, title: "Risk Buckets", dataKey: "riskBuckets", size: "large" as const },
      { type: "trend_line" as WidgetType, title: "Score Distribution", dataKey: "scores", size: "large" as const },
      { type: "table" as WidgetType, title: "High-Risk Applications", dataKey: "applications", size: "large" as const },
    ],
  },
  {
    name: "Portfolio Overview",
    description: "Exposure, income, debt, and full application data",
    widgets: [
      { type: "metric" as WidgetType, title: "Total Exposure", dataKey: "totalExposure", size: "small" as const },
      { type: "metric" as WidgetType, title: "Avg Annual Income", dataKey: "avgAnnualIncome", size: "small" as const },
      { type: "metric" as WidgetType, title: "Avg Monthly Debt", dataKey: "avgMonthlyDebt", size: "small" as const },
      { type: "metric" as WidgetType, title: "Total Documents", dataKey: "totalDocuments", size: "small" as const },
      { type: "pie_chart" as WidgetType, title: "Decisions", dataKey: "decisions", size: "medium" as const },
      { type: "table" as WidgetType, title: "All Applications", dataKey: "applications", size: "large" as const },
    ],
  },
];

let idCounter = 0;
function makeId() {
  return `w-${++idCounter}-${Date.now()}`;
}

function formatMetricValue(key: string, value: number): string {
  if (key === "totalExposure" || key === "avgMonthlyDebt" || key === "avgAnnualIncome") {
    return `$${formatCurrency(value)}`;
  }
  if (key === "approvalRate" || key === "manualReviewRate") {
    return `${value}%`;
  }
  return value.toString();
}

function MetricWidget({ title, dataKey, data }: { title: string; dataKey: string; data: ReportData }) {
  const value = data.metrics[dataKey];
  return (
    <div className="rounded-xl border border-line p-4">
      <p className="text-xs font-medium text-muted">{title}</p>
      <p className="mt-2 text-3xl font-bold text-foreground">
        {value !== undefined ? formatMetricValue(dataKey, value) : "--"}
      </p>
    </div>
  );
}

function BarChartWidget({ title, data }: { title: string; data: ReportData }) {
  const buckets = data.riskBuckets;
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="rounded-xl border border-line p-4">
      <p className="mb-4 text-xs font-medium text-muted">{title}</p>
      <div className="space-y-3">
        {buckets.map((bucket) => (
          <div key={bucket.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-foreground">{bucket.label}</span>
              <span className="font-mono font-medium text-foreground">{bucket.count}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface-dim">
              <div
                className={`${bucket.color} h-full rounded-full transition-all`}
                style={{ width: `${(bucket.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PieChartWidget({ title, data }: { title: string; data: ReportData }) {
  const { approved, review, rejected, pending } = data.decisions;
  const total = approved + review + rejected + pending || 1;
  const segments = [
    { label: "Approved", count: approved, pct: Math.round((approved / total) * 100), color: "bg-emerald-500", ring: "text-emerald-500" },
    { label: "Review", count: review, pct: Math.round((review / total) * 100), color: "bg-amber-500", ring: "text-amber-500" },
    { label: "Rejected", count: rejected, pct: Math.round((rejected / total) * 100), color: "bg-red-500", ring: "text-red-500" },
    { label: "Pending", count: pending, pct: Math.round((pending / total) * 100), color: "bg-slate-400", ring: "text-slate-400" },
  ];

  return (
    <div className="rounded-xl border border-line p-4">
      <p className="mb-4 text-xs font-medium text-muted">{title}</p>
      <div className="flex h-4 overflow-hidden rounded-full bg-surface-dim">
        {segments.map((s) =>
          s.pct > 0 ? <div key={s.label} className={`${s.color}`} style={{ width: `${s.pct}%` }} /> : null,
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
            <span className="text-muted">{s.label}</span>
            <span className="ml-auto font-mono font-medium text-foreground">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TableWidget({ title, data }: { title: string; data: ReportData }) {
  const rows = data.applicationRows;
  const [tablePage, setTablePage] = useState(1);
  const tablePageSize = 10;
  const totalTablePages = Math.max(1, Math.ceil(rows.length / tablePageSize));
  const safePage = Math.min(tablePage, totalTablePages);
  const tableStart = (safePage - 1) * tablePageSize;
  const pageRows = rows.slice(tableStart, tableStart + tablePageSize);

  return (
    <div className="rounded-xl border border-line p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium text-muted">{title}</p>
        {rows.length > tablePageSize && (
          <span className="text-[11px] text-muted">
            {tableStart + 1}-{Math.min(tableStart + tablePageSize, rows.length)} of {rows.length}
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-line-subtle text-left text-muted">
              <th className="pb-2 pr-4 font-medium">Applicant</th>
              <th className="pb-2 pr-4 font-medium">Score</th>
              <th className="pb-2 pr-4 font-medium">Amount</th>
              <th className="pb-2 pr-4 font-medium">Decision</th>
              <th className="pb-2 pr-4 font-medium">Flags</th>
              <th className="pb-2 font-medium">Docs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-subtle">
            {pageRows.map((row) => (
              <tr key={row.id} className="text-foreground">
                <td className="py-2 pr-4 font-medium">{row.name}</td>
                <td className="py-2 pr-4 font-mono">{row.score}</td>
                <td className="py-2 pr-4 font-mono">${row.amount.toLocaleString()}</td>
                <td className="py-2 pr-4">
                  <span className={cn(
                    "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                    row.decision === "approve" ? "bg-success-light text-success" : row.decision === "review" ? "bg-warning-light text-warning" : row.decision === "reject" ? "bg-danger-light text-danger" : "bg-surface-dim text-muted",
                  )}>
                    {row.decision}
                  </span>
                </td>
                <td className="py-2 pr-4">{row.flags}</td>
                <td className="py-2">{row.docs}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="py-4 text-center text-muted">No application data available</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > tablePageSize && (
        <div className="mt-3 flex items-center justify-center gap-1">
          <button type="button" disabled={safePage <= 1} onClick={() => setTablePage((p) => p - 1)} className="rounded px-2.5 py-1.5 text-xs text-muted min-h-[36px] hover:bg-surface-dim disabled:opacity-30">Prev</button>
          {Array.from({ length: totalTablePages }, (_, i) => i + 1).slice(0, 5).map((p) => (
            <button key={p} type="button" onClick={() => setTablePage(p)} className={cn("rounded px-2.5 py-1.5 text-xs font-medium min-h-[36px]", safePage === p ? "bg-accent text-white" : "text-muted hover:bg-surface-dim")}>{p}</button>
          ))}
          {totalTablePages > 5 && <span className="px-1 text-xs text-muted">...</span>}
          <button type="button" disabled={safePage >= totalTablePages} onClick={() => setTablePage((p) => p + 1)} className="rounded px-2.5 py-1.5 text-xs text-muted min-h-[36px] hover:bg-surface-dim disabled:opacity-30">Next</button>
        </div>
      )}
    </div>
  );
}

function TrendWidget({ title, data }: { title: string; data: ReportData }) {
  const scores = data.applicationRows.map((r) => r.score);
  if (scores.length === 0) {
    return (
      <div className="rounded-xl border border-line p-4">
        <p className="text-xs font-medium text-muted">{title}</p>
        <p className="mt-4 text-center text-xs text-muted">No data available</p>
      </div>
    );
  }

  const maxScore = Math.max(...scores, 1);
  const points = scores
    .map((s, i) => {
      const x = (i / Math.max(scores.length - 1, 1)) * 280;
      const y = 60 - (s / maxScore) * 50;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,60 ${points} 280,60`;

  return (
    <div className="rounded-xl border border-line p-4">
      <p className="mb-3 text-xs font-medium text-muted">{title}</p>
      <div className="flex items-center gap-4 text-xs text-muted">
        <span>Min: {Math.min(...scores)}</span>
        <span>Max: {Math.max(...scores)}</span>
        <span>Avg: {Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}</span>
      </div>
      <svg viewBox="0 0 280 70" className="mt-2 h-20 w-full">
        <polygon points={areaPoints} fill="rgba(79, 70, 229, 0.08)" />
        <polyline
          points={points}
          fill="none"
          stroke="rgba(79, 70, 229, 0.8)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {scores.map((s, i) => {
          const x = (i / Math.max(scores.length - 1, 1)) * 280;
          const y = 60 - (s / maxScore) * 50;
          return <circle key={i} cx={x} cy={y} r="3" fill="rgba(79, 70, 229, 0.9)" />;
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        {scores.map((s, i) => (
          <span key={i}>{s}</span>
        ))}
      </div>
    </div>
  );
}

function TextWidget({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-line p-4">
      <p className="mb-2 text-xs font-medium text-muted">{title}</p>
      <p className="text-sm leading-6 text-foreground">
        This report was generated from live underwriting data. All metrics reflect the current state
        of the portfolio at the time of generation. Review findings with the underwriting team
        before making policy adjustments.
      </p>
    </div>
  );
}

function exportCsv(reportName: string, data: ReportData) {
  const headers = ["Applicant", "Risk Score", "Amount", "Decision", "Status", "Flags", "Documents"];
  const rows = data.applicationRows.map((r) =>
    [r.name, r.score, r.amount, r.decision, r.status, r.flags, r.docs].join(","),
  );

  const metricsSection = Object.entries(data.metrics)
    .map(([key, value]) => `${key},${value}`)
    .join("\n");

  const csv = [
    `Report: ${reportName}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "--- Metrics ---",
    "Metric,Value",
    metricsSection,
    "",
    "--- Decisions ---",
    `Approved,${data.decisions.approved}`,
    `Review,${data.decisions.review}`,
    `Rejected,${data.decisions.rejected}`,
    `Pending,${data.decisions.pending}`,
    "",
    "--- Risk Buckets ---",
    "Bucket,Count",
    ...data.riskBuckets.map((b) => `${b.label},${b.count}`),
    "",
    "--- Applications ---",
    headers.join(","),
    ...rows,
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${reportName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportPdf(reportName: string, data: ReportData, widgets: ReportWidget[]) {
  const win = window.open("", "_blank");
  if (!win) return;

  const metricRows = Object.entries(data.metrics)
    .map(([key, val]) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${key}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:600;text-align:right">${typeof val === "number" && (key.includes("Exposure") || key.includes("Debt") || key.includes("Income")) ? "$" + formatCurrency(val) : key.includes("Rate") ? val + "%" : val}</td></tr>`)
    .join("");

  const appRows = data.applicationRows
    .map((r) => `<tr><td style="padding:4px 8px;border-bottom:1px solid #f0f0f0">${r.name}</td><td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;text-align:center">${r.score}</td><td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;text-align:right">$${formatCurrency(r.amount)}</td><td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;text-align:center">${r.decision}</td></tr>`)
    .join("");

  const html = `<!DOCTYPE html>
<html><head><title>${reportName}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;margin:40px;color:#1a1a2e;line-height:1.5}
h1{font-size:24px;margin-bottom:4px}
h2{font-size:16px;color:#4f46e5;margin-top:32px;margin-bottom:12px;border-bottom:2px solid #eef2ff;padding-bottom:6px}
.subtitle{color:#6b7280;font-size:13px;margin-bottom:24px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:8px;background:#f8f9fb;border-bottom:2px solid #e2e5ea;font-weight:600;color:#374151}
.decisions{display:flex;gap:16px;margin-top:8px}
.decision-box{flex:1;padding:12px;border-radius:8px;text-align:center}
.decision-box .count{font-size:28px;font-weight:700}
.decision-box .label{font-size:12px;color:#6b7280;margin-top:2px}
.metric-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px}
.metric-card{padding:12px;border:1px solid #e2e5ea;border-radius:8px}
.metric-card .value{font-size:20px;font-weight:700;margin-top:4px}
.metric-card .label{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px}
@media print{body{margin:20px}h1{font-size:20px}}
</style></head><body>
<h1>${reportName}</h1>
<p class="subtitle">Generated ${new Date().toLocaleString()} &bull; ${widgets.length} widgets &bull; Aegis Underwriting Platform</p>

<h2>Key Metrics</h2>
<div class="metric-grid">
${Object.entries(data.metrics).map(([key, val]) => {
    const formatted = (key.includes("Exposure") || key.includes("Debt") || key.includes("Income")) ? "$" + formatCurrency(val) : key.includes("Rate") ? val + "%" : val;
    return `<div class="metric-card"><div class="label">${key.replace(/([A-Z])/g, " $1").trim()}</div><div class="value">${formatted}</div></div>`;
  }).join("")}
</div>

<h2>Decision Distribution</h2>
<div class="decisions">
  <div class="decision-box" style="background:#ecfdf5"><div class="count" style="color:#059669">${data.decisions.approved}</div><div class="label">Approved</div></div>
  <div class="decision-box" style="background:#fffbeb"><div class="count" style="color:#d97706">${data.decisions.review}</div><div class="label">Review</div></div>
  <div class="decision-box" style="background:#fef2f2"><div class="count" style="color:#dc2626">${data.decisions.rejected}</div><div class="label">Rejected</div></div>
  <div class="decision-box" style="background:#f1f5f9"><div class="count" style="color:#64748b">${data.decisions.pending}</div><div class="label">Pending</div></div>
</div>

<h2>Risk Score Distribution</h2>
<table><thead><tr><th>Bucket</th><th style="text-align:right">Count</th></tr></thead><tbody>
${data.riskBuckets.map((b) => `<tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0">${b.label}</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">${b.count}</td></tr>`).join("")}
</tbody></table>

<h2>Application Data</h2>
<table><thead><tr><th>Applicant</th><th style="text-align:center">Score</th><th style="text-align:right">Amount</th><th style="text-align:center">Decision</th></tr></thead><tbody>
${appRows}
</tbody></table>

<script>setTimeout(()=>window.print(),500)<\/script>
</body></html>`;

  win.document.write(html);
  win.document.close();
}

function WidgetRenderer({ widget, data, onRemove }: { widget: ReportWidget; data: ReportData; onRemove: () => void }) {
  const sizeClass = widget.size === "large" ? "sm:col-span-2" : "";
  const catalogEntry = widgetCatalog.find((w) => w.type === widget.type);
  const Icon = catalogEntry?.icon ?? BarChart3;

  return (
    <div className={`group relative ${sizeClass}`}>
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-muted opacity-0 shadow-sm transition hover:bg-danger-light hover:text-danger group-hover:opacity-100"
      >
        <Trash2 className="h-3 w-3" />
      </button>
      <div className="absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded bg-surface/80 text-muted/40 opacity-0 group-hover:opacity-100">
        <GripVertical className="h-3 w-3" />
      </div>

      {widget.type === "metric" && <MetricWidget title={widget.title} dataKey={widget.dataKey} data={data} />}
      {widget.type === "bar_chart" && <BarChartWidget title={widget.title} data={data} />}
      {widget.type === "pie_chart" && <PieChartWidget title={widget.title} data={data} />}
      {widget.type === "table" && <TableWidget title={widget.title} data={data} />}
      {widget.type === "trend_line" && <TrendWidget title={widget.title} data={data} />}
      {widget.type === "text_block" && <TextWidget title={widget.title} />}
    </div>
  );
}

export function ReportBuilder({ data }: Props) {
  const [widgets, setWidgets] = useState<ReportWidget[]>([]);
  const [showCatalog, setShowCatalog] = useState(false);
  const [reportName, setReportName] = useState("Untitled Report");
  const [selectedMetric, setSelectedMetric] = useState(metricOptions[0].key);
  const [draggingType, setDraggingType] = useState<WidgetType | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const addWidget = useCallback((type: WidgetType, dataKey?: string, title?: string) => {
    const catalog = widgetCatalog.find((w) => w.type === type);
    setWidgets((prev) => [
      ...prev,
      {
        id: makeId(),
        type,
        title: title ?? catalog?.label ?? "Widget",
        dataKey: dataKey ?? (type === "metric" ? selectedMetric : type === "bar_chart" ? "riskBuckets" : type === "pie_chart" ? "decisions" : "applications"),
        size: type === "table" || type === "trend_line" || type === "bar_chart" ? "large" : "small",
      },
    ]);
    setShowCatalog(false);
  }, [selectedMetric]);

  const removeWidget = useCallback((id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const loadTemplate = useCallback((index: number) => {
    const tpl = templates[index];
    if (!tpl) return;
    setWidgets(tpl.widgets.map((w) => ({ ...w, id: makeId() })));
    setReportName(tpl.name);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-dim p-4">
        <div className="flex items-center gap-3">
          <LayoutGrid className="h-5 w-5 text-accent" />
          <input
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            className="border-0 bg-transparent text-base font-semibold text-foreground outline-none placeholder:text-muted"
            placeholder="Report name"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCatalog(!showCatalog)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong"
          >
            <Plus className="h-3.5 w-3.5" />
            Add widget
          </button>
          {widgets.length > 0 && (
            <button
              type="button"
              onClick={() => setWidgets([])}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium text-muted transition hover:text-foreground"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {showCatalog && (
        <div className="rounded-xl border border-accent/20 bg-accent-light/30 p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Add a widget</p>
            <button type="button" onClick={() => setShowCatalog(false)} className="text-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {widgetCatalog.map((widget) => {
              const Icon = widget.icon;
              const isMetric = widget.type === "metric";
              return (
                <div key={widget.type} className="rounded-lg border border-line bg-surface p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-light text-accent">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{widget.label}</p>
                      <p className="text-[11px] text-muted">{widget.description}</p>
                    </div>
                  </div>
                  {isMetric && (
                    <div className="mt-2 flex items-center gap-2">
                      <select
                        value={selectedMetric}
                        onChange={(e) => setSelectedMetric(e.target.value)}
                        className="flex-1 rounded-md border border-line bg-surface-dim px-2 py-1 text-xs text-foreground outline-none"
                      >
                        {metricOptions.map((opt) => (
                          <option key={opt.key} value={opt.key}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const metricLabel = isMetric ? metricOptions.find((m) => m.key === selectedMetric)?.label : undefined;
                      addWidget(widget.type, undefined, metricLabel);
                    }}
                    className="mt-2 w-full rounded-md bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/20"
                  >
                    Add to report
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-line bg-surface-dim p-4">
        <div className="mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold text-foreground">Quick start templates</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {templates.map((template, i) => (
            <button
              key={template.name}
              type="button"
              onClick={() => loadTemplate(i)}
              className="rounded-lg border border-line bg-surface p-3 text-left transition hover:border-accent/30 hover:shadow-sm"
            >
              <p className="text-sm font-medium text-foreground">{template.name}</p>
              <p className="mt-0.5 text-[11px] text-muted">{template.widgets.length} widgets &middot; {template.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => {
          if (draggingType) {
            addWidget(draggingType);
            setDraggingType(null);
          }
        }}
        className={cn(
          "min-h-[200px] rounded-xl border-2 border-dashed p-5 transition",
          draggingType ? "border-accent/40 bg-accent-light/30" : "border-line",
          widgets.length === 0 && "flex items-center justify-center",
        )}
      >
        {widgets.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {widgets.map((widget) => (
              <WidgetRenderer
                key={widget.id}
                widget={widget}
                data={data}
                onRemove={() => removeWidget(widget.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center">
            <Settings2 className="mx-auto h-10 w-10 text-muted/30" />
            <p className="mt-3 text-sm font-medium text-foreground">Your report canvas is empty</p>
            <p className="mt-1 text-xs text-muted">
              Pick a template above to get started, or add individual widgets.
            </p>
            <button
              type="button"
              onClick={() => loadTemplate(0)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong"
            >
              <Layers className="h-3.5 w-3.5" />
              Load Executive Summary
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success-light px-3 py-2 text-xs text-success">
          <CheckCircle2 className="h-3 w-3" />
          {feedback}
        </div>
      )}

      {widgets.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-subtle bg-surface p-4">
          <p className="text-xs text-muted">
            {widgets.length} widget{widgets.length !== 1 ? "s" : ""} &middot; {reportName}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportPdf(reportName, data, widgets)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:text-foreground"
            >
              <Download className="h-3 w-3" />
              Export PDF
            </button>
            <button
              type="button"
              onClick={() => exportCsv(reportName, data)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:text-foreground"
            >
              <Download className="h-3 w-3" />
              Export CSV
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setSaving(true);
                setFeedback(null);
                startTransition(async () => {
                  try {
                    await saveReport(reportName, widgets);
                    setFeedback(`Report "${reportName}" saved successfully.`);
                  } catch (err) {
                    setFeedback(err instanceof Error ? err.message : "Failed to save report.");
                  } finally {
                    setSaving(false);
                  }
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:bg-accent-strong disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {saving ? "Saving..." : "Save report"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
