import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  FileSpreadsheet,
  FlaskConical,
  MapPin,
  PlugZap,
  Radar,
  Scale,
  Shield,
  ShieldAlert,
  Sliders,
  TestTubeDiagonal,
  Workflow,
} from "lucide-react";

const modules = [
  {
    title: "Applications",
    description: "Intake, scoring, and case management",
    href: "/applications",
    icon: BriefcaseBusiness,
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    title: "Fraud Detection",
    description: "Claims fraud alerts and pattern analysis",
    href: "/claims",
    icon: ShieldAlert,
    color: "bg-red-50 text-red-600",
  },
  {
    title: "Portfolio",
    description: "Risk analytics and exposure tracking",
    href: "/portfolio",
    icon: Activity,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Compliance",
    description: "Regulatory checks and audit readiness",
    href: "/compliance",
    icon: Shield,
    color: "bg-amber-50 text-amber-600",
  },
  {
    title: "Workflows",
    description: "Decision routing and orchestration",
    href: "/workflows",
    icon: Workflow,
    color: "bg-violet-50 text-violet-600",
  },
  {
    title: "Models",
    description: "Registry, versioning, and A/B testing",
    href: "/models",
    icon: TestTubeDiagonal,
    color: "bg-rose-50 text-rose-600",
  },
  {
    title: "Risk Factors",
    description: "Custom factor weights and configuration",
    href: "/risk-factors",
    icon: Sliders,
    color: "bg-sky-50 text-sky-600",
  },
  {
    title: "Geospatial",
    description: "Location-based risk assessment",
    href: "/geospatial",
    icon: MapPin,
    color: "bg-lime-50 text-lime-600",
  },
  {
    title: "Stress Testing",
    description: "Scenario modeling and resilience",
    href: "/stress-testing",
    icon: FlaskConical,
    color: "bg-fuchsia-50 text-fuchsia-600",
  },
  {
    title: "Audit Trail",
    description: "Decision logging and explainability",
    href: "/audit",
    icon: Scale,
    color: "bg-stone-100 text-stone-600",
  },
  {
    title: "Analytics",
    description: "Deep operational analytics and KPIs",
    href: "/analytics",
    icon: BarChart3,
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Monitoring",
    description: "System health and drift detection",
    href: "/monitoring",
    icon: Radar,
    color: "bg-cyan-50 text-cyan-600",
  },
  {
    title: "Reports",
    description: "Custom analytics and exports",
    href: "/reports",
    icon: FileSpreadsheet,
    color: "bg-teal-50 text-teal-600",
  },
  {
    title: "Integrations",
    description: "API connectors and data sources",
    href: "/integrations",
    icon: PlugZap,
    color: "bg-orange-50 text-orange-600",
  },
];

export function ModuleGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {modules.map((mod) => {
        const Icon = mod.icon;
        return (
          <Link
            key={mod.title}
            href={mod.href}
            className="group rounded-xl border border-line p-4 transition hover:border-accent/30 hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${mod.color}`}>
                <Icon className="h-[18px] w-[18px]" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted opacity-0 transition group-hover:opacity-100" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">{mod.title}</p>
            <p className="mt-0.5 text-xs text-muted">{mod.description}</p>
          </Link>
        );
      })}
    </div>
  );
}
