"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  Menu,
  PlugZap,
  Radar,
  Scale,
  Shield,
  ShieldAlert,
  Sliders,
  TestTubeDiagonal,
  Workflow,
  X,
} from "lucide-react";
import { AppProfile } from "@/lib/auth/session";
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";
import { cn } from "@/lib/utils";

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
      { href: "/reports", label: "Reports", icon: FileSpreadsheet },
      { href: "/integrations", label: "Integrations", icon: PlugZap },
    ],
  },
];

export function MobileNav({ currentPath, profile }: Props) {
  const [open, setOpen] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => setAnimating(true));
    } else {
      document.body.style.overflow = "";
      setAnimating(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleClose() {
    setAnimating(false);
    setTimeout(() => setOpen(false), 200);
  }

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-surface-dim hover:text-foreground"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className={cn(
                "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200",
                animating ? "opacity-100" : "opacity-0",
              )}
              onClick={handleClose}
              aria-hidden="true"
            />

            <div
              className={cn(
                "sidebar fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col shadow-2xl transition-transform duration-200 ease-out",
                animating ? "translate-x-0" : "-translate-x-full",
              )}
              style={{ backgroundColor: "var(--surface)" }}
            >
            {/* Header */}
            <div className="flex h-[var(--navbar-height)] shrink-0 items-center justify-between border-b border-line-subtle px-4">
              <div className="flex items-center gap-3">
                <div className="sidebar-brand flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm font-bold tracking-tight text-foreground">Aegis</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-surface-dim"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nav — flex-1 + min-h-0 + overflow-y-auto fills remaining space, scrolls when needed */}
            <nav className="custom-scroll flex-1 min-h-0 overflow-y-auto px-3 py-3">
              {navSections.map((section) => (
                <div key={section.label} className="mb-4">
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
                          onClick={handleClose}
                          className={cn("sidebar-nav-item", active && "active")}
                        >
                          <Icon className={cn("h-[18px] w-[18px]", active ? "text-accent" : "text-muted")} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* Footer — sits at the bottom of the flex column, never overlaps */}
            <div className="shrink-0 border-t border-line-subtle px-4 py-3 space-y-3">
              <div className="rounded-lg border border-line-subtle bg-surface-dim/50 px-3 py-2">
                <p className="sidebar-section-label mb-2">Workspace</p>
                <WorkspaceSwitcher
                  workspaces={profile.workspaces ?? [{ tenantId: profile.tenantId, tenantName: profile.tenantName, role: profile.role }]}
                  currentTenantId={profile.tenantId}
                />
              </div>
              <div className="sidebar-profile-card flex items-center gap-3 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent ring-2 ring-accent/20">
                  {profile.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{profile.fullName}</p>
                  <p className="truncate text-[11px] font-medium text-muted">{profile.tenantName}</p>
                </div>
              </div>
            </div>
          </div>
          </>,
          document.body,
        )}
    </div>
  );
}
