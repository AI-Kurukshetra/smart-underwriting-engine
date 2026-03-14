import { UnderwritingApplication } from "@/lib/domain";

type Props = {
  applications: UnderwritingApplication[];
};

export function RiskDistribution({ applications }: Props) {
  const buckets = [
    { label: "Low risk", range: "0–30", min: 0, max: 30, color: "bg-emerald-500" },
    { label: "Moderate", range: "31–60", min: 31, max: 60, color: "bg-amber-400" },
    { label: "High risk", range: "61–80", min: 61, max: 80, color: "bg-orange-500" },
    { label: "Critical", range: "81–100", min: 81, max: 100, color: "bg-red-500" },
  ];

  const total = applications.length || 1;
  const bucketData = buckets.map((bucket) => {
    const count = applications.filter(
      (app) => app.riskScore >= bucket.min && app.riskScore <= bucket.max,
    ).length;
    return { ...bucket, count, pct: Math.round((count / total) * 100) };
  });

  return (
    <div className="space-y-4">
      <div className="flex h-3 overflow-hidden rounded-full bg-surface-dim">
        {bucketData.map((b) =>
          b.pct > 0 ? (
            <div
              key={b.label}
              className={`${b.color} transition-all`}
              style={{ width: `${b.pct}%` }}
            />
          ) : null,
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {bucketData.map((b) => (
          <div key={b.label} className="rounded-xl border border-line-subtle p-3 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${b.color}`} />
              <span className="text-xs font-medium text-muted">{b.label}</span>
            </div>
            <p className="mt-1 text-lg font-bold text-foreground">{b.count}</p>
            <p className="text-[11px] text-muted">{b.pct}% of portfolio</p>
          </div>
        ))}
      </div>
    </div>
  );
}
