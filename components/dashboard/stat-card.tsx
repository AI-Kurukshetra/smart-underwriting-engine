import { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string;
  delta: string;
  icon: ReactNode;
  trend?: "up" | "down" | "neutral";
};

export function StatCard({ label, value, delta, icon, trend = "neutral" }: StatCardProps) {
  return (
    <div className="card-elevated p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light text-accent">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-foreground">{value}</p>
      <p className={`mt-1 text-xs ${trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-muted"}`}>
        {delta}
      </p>
    </div>
  );
}
