import Link from "next/link";
import {
  Activity,
  BarChart3,
  Brain,
  BriefcaseBusiness,
  ChartNoAxesCombined,
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
  Users,
  Workflow,
} from "lucide-react";
import { AppProfile } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/theme-toggle";

type Props = {
  currentPath: string;
  profile: AppProfile;
};

const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: ChartNoAxesCombined },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Underwriting",
    items: [
      { href: "/applications", label: "Applications", icon: BriefcaseBusiness },
      { href: "/workflows", label: "Workflows", icon: Workflow },
      { href: "/claims", label: "Fraud Detection", icon: ShieldAlert },
      { href: "/risk-factors", label: "Risk Factors", icon: Sliders },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/portfolio", label: "Portfolio", icon: Activity },
      { href: "/models", label: "Model Registry", icon: TestTubeDiagonal },
      { href: "/geospatial", label: "Geospatial", icon: MapPin },
      { href: "/stress-testing", label: "Stress Testing", icon: FlaskConical },
    ],
  },
  {
    label: "Governance",
    items: [
      { href: "/explainability", label: "Explainability", icon: Brain },
      { href: "/compliance", label: "Compliance", icon: Shield },
      { href: "/audit", label: "Audit Trail", icon: Scale },
      { href: "/monitoring", label: "Monitoring", icon: Radar },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/team", label: "Team", icon: Users },
      { href: "/reports", label: "Reports", icon: FileSpreadsheet },
      { href: "/integrations", label: "Integrations", icon: PlugZap },
    ],
  },
];

export function DashboardSidebar({ currentPath, profile }: Props) {
  return (
    <aside className="sidebar flex h-screen w-[var(--sidebar-width)] flex-col">
      <div className="flex h-[var(--navbar-height)] items-center gap-3 border-b border-line-subtle px-5">
        <div className="sidebar-brand flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold tracking-tight text-foreground">Aegis</p>
          <p className="truncate text-[11px] font-medium text-muted">{profile.tenantName}</p>
        </div>
      </div>

      <nav className="custom-scroll flex-1 overflow-y-auto px-2 py-5">
        {navSections.map((section) => (
          <div key={section.label} className="mb-6">
            <p className="sidebar-section-label mb-2 px-4">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = currentPath === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn("sidebar-nav-item", active && "active")}
                  >
                    <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-accent" : "text-muted")} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-line-subtle px-4 py-4 space-y-3">
        <div className="rounded-lg border border-line-subtle bg-surface-dim/50 px-3 py-2">
          <p className="sidebar-section-label mb-2">Theme</p>
          <ThemeToggle />
        </div>
        <div className="sidebar-profile-card flex items-center gap-3 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent ring-2 ring-accent/20">
            {profile.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{profile.fullName}</p>
            <p className="truncate text-[11px] font-medium text-muted">{profile.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
