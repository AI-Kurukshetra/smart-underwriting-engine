"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, Bell, BellOff, CheckCircle2, Clock, RefreshCw, Zap } from "lucide-react";
import { SectionCard } from "@/components/dashboard/section-card";
import { Badge } from "@/components/ui/badge";
import { persistSetting } from "@/lib/api-client";

const apiMetrics = [
  { endpoint: "POST /applications", avgLatency: 380, p99Latency: 920, requestsPerMin: 12, errorRate: 0.2, status: "healthy" },
  { endpoint: "POST /risk-assessment", avgLatency: 420, p99Latency: 1100, requestsPerMin: 18, errorRate: 0.1, status: "healthy" },
  { endpoint: "POST /score", avgLatency: 310, p99Latency: 780, requestsPerMin: 22, errorRate: 0.0, status: "healthy" },
  { endpoint: "GET /explanation", avgLatency: 1200, p99Latency: 3400, requestsPerMin: 8, errorRate: 1.5, status: "warning" },
  { endpoint: "POST /documents", avgLatency: 2100, p99Latency: 5200, requestsPerMin: 5, errorRate: 3.2, status: "warning" },
  { endpoint: "GET /portfolio/metrics", avgLatency: 180, p99Latency: 420, requestsPerMin: 4, errorRate: 0.0, status: "healthy" },
];

type AlertItem = {
  id: string | number;
  message: string;
  severity: string;
  timestamp: string;
  acknowledged: boolean;
};

type Props = {
  initialAlerts?: AlertItem[];
};

export function MonitoringDashboard({ initialAlerts }: Props) {
  const router = useRouter();
  const [alerts, setAlerts] = useState(initialAlerts ?? []);
  const [refreshing, setRefreshing] = useState(false);

  function acknowledgeAlert(id: string | number) {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)),
    );
    const alert = alerts.find((a) => a.id === id);
    if (alert) {
      persistSetting("monitoring_alerts", "insert", {
        message: alert.message,
        severity: alert.severity,
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
      }).then(() => router.refresh()).catch(() => {});
    }
  }

  function simulateRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card-elevated p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-muted">Avg API latency</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light text-accent"><Zap className="h-4 w-4" /></div>
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground">{Math.round(apiMetrics.reduce((s, m) => s + m.avgLatency, 0) / apiMetrics.length)}ms</p>
          <p className="mt-1 text-xs text-muted">Across all endpoints</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-sm font-medium text-muted">Request volume</p>
          <p className="mt-3 text-2xl font-bold text-foreground">{apiMetrics.reduce((s, m) => s + m.requestsPerMin, 0)}/min</p>
          <p className="mt-1 text-xs text-muted">Total throughput</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-sm font-medium text-muted">Error rate</p>
          <p className="mt-3 text-2xl font-bold text-foreground">{(apiMetrics.reduce((s, m) => s + m.errorRate, 0) / apiMetrics.length).toFixed(1)}%</p>
          <p className="mt-1 text-xs text-muted">Weighted average</p>
        </div>
        <div className="card-elevated p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-muted">Pending alerts</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning-light text-warning"><Bell className="h-4 w-4" /></div>
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground">{unacknowledgedCount}</p>
          <p className="mt-1 text-xs text-muted">Require acknowledgement</p>
        </div>
      </section>

      <SectionCard
        eyebrow="APIs"
        title="Endpoint performance"
        description="Real-time latency, throughput, and error rates for each API endpoint."
        action={
          <button
            type="button"
            onClick={simulateRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:text-foreground disabled:opacity-60"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line-subtle text-left text-muted">
                <th className="pb-2 pr-4 font-medium">Endpoint</th>
                <th className="pb-2 pr-4 font-medium">Avg latency</th>
                <th className="pb-2 pr-4 font-medium">P99</th>
                <th className="pb-2 pr-4 font-medium">Req/min</th>
                <th className="pb-2 pr-4 font-medium">Error rate</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {apiMetrics.map((metric) => (
                <tr key={metric.endpoint} className="text-foreground">
                  <td className="py-2.5 pr-4 font-mono font-medium">{metric.endpoint}</td>
                  <td className="py-2.5 pr-4 font-mono">{metric.avgLatency}ms</td>
                  <td className="py-2.5 pr-4 font-mono">{metric.p99Latency}ms</td>
                  <td className="py-2.5 pr-4 font-mono">{metric.requestsPerMin}</td>
                  <td className="py-2.5 pr-4 font-mono">{metric.errorRate}%</td>
                  <td className="py-2.5">
                    <Badge tone={metric.status === "healthy" ? "success" : "warning"}>{metric.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Alerts" title="Alert history" description="System alerts with acknowledgement tracking. Acknowledge pending alerts to clear the queue.">
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert.id} className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${!alert.acknowledged ? "border-warning/20 bg-warning-light/30" : "border-line-subtle"}`}>
              <div className="flex items-start gap-3 sm:items-center">
                {alert.severity === "warning" ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning sm:mt-0" />
                ) : alert.severity === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success sm:mt-0" />
                ) : (
                  <Activity className="mt-0.5 h-4 w-4 shrink-0 text-accent sm:mt-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{alert.message}</p>
                  <p className="text-[11px] text-muted">{alert.timestamp}</p>
                </div>
              </div>
              {!alert.acknowledged ? (
                <button
                  type="button"
                  onClick={() => acknowledgeAlert(alert.id)}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition min-h-[40px] hover:bg-accent/20"
                >
                  <BellOff className="h-3.5 w-3.5" />
                  Acknowledge
                </button>
              ) : (
                <Badge tone="neutral">Acknowledged</Badge>
              )}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
