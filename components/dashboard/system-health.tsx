import { CheckCircle2, AlertCircle, Circle } from "lucide-react";

type HealthItem = {
  label: string;
  status: string;
  note: string;
};

type Props = {
  items: HealthItem[];
};

const statusConfig = {
  healthy: {
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success-light",
    label: "Operational",
  },
  warning: {
    icon: AlertCircle,
    color: "text-warning",
    bg: "bg-warning-light",
    label: "Degraded",
  },
  down: {
    icon: Circle,
    color: "text-danger",
    bg: "bg-danger-light",
    label: "Down",
  },
};

export function SystemHealth({ items }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => {
        const config = statusConfig[item.status as keyof typeof statusConfig] ?? statusConfig.healthy;
        const Icon = config.icon;

        return (
          <div key={item.label} className="flex items-start gap-3 rounded-xl border border-line-subtle p-4">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
              <Icon className={`h-4 w-4 ${config.color}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <span className={`text-[11px] font-medium ${config.color}`}>{config.label}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted">{item.note}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
