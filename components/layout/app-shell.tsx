import { ReactNode } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { GlobalSearch } from "@/components/layout/global-search";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationPanel } from "@/components/layout/notification-panel";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AppProfile } from "@/lib/auth/session";

type Props = {
  profile: AppProfile;
  currentPath: string;
  eyebrow: string;
  title: string;
  description: string;
  badgeTone?: "info" | "success" | "warning" | "danger" | "neutral";
  children: ReactNode;
};

export function AppShell({ profile, currentPath, eyebrow, title, description, children }: Props) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">
        <DashboardSidebar currentPath={currentPath} profile={profile} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-[var(--sidebar-width)]">
        <header className="header-bar sticky top-0 z-20 flex min-h-[var(--navbar-height)] items-center justify-between gap-3 border-b border-line-subtle bg-surface/90 px-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <MobileNav currentPath={currentPath} profile={profile} />
            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden h-8 w-px bg-line sm:block" />
              <div className="min-w-0">
                <span className="inline-block rounded-md bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent sm:text-xs">
                  {eyebrow}
                </span>
                <h1 className="mt-0.5 truncate text-base font-bold tracking-tight text-foreground sm:text-lg">
                  {title}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-line-subtle bg-surface-dim/50 px-2 py-1.5 sm:gap-2 sm:px-3">
            <GlobalSearch />
            <NotificationPanel />
            <ThemeToggle compact />
            <div className="mx-0.5 h-4 w-px bg-line sm:mx-1 sm:h-5" />
            <SignOutButton />
          </div>
        </header>

        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
          <p className="mb-4 max-w-3xl text-sm text-muted sm:mb-6">{description}</p>
          <div className="space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
