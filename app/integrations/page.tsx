import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import { Badge } from "@/components/ui/badge";
import { requireProfile } from "@/lib/auth/session";
import { getIntegrationsOverview } from "@/lib/repositories/overview";

export default async function IntegrationsPage() {
  const profile = await requireProfile(["admin", "analyst", "underwriter"]);
  const integrations = getIntegrationsOverview();

  return (
    <AppShell
      profile={profile}
      currentPath="/integrations"
      eyebrow="Integrations"
      title="External Systems & API"
      description="Connectivity layer for current services and future data-provider integrations."
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          eyebrow="Connectors"
          title="Integration inventory"
          description="Current and planned external services."
        >
          <div className="space-y-3">
            {integrations.integrations.map((integration) => (
              <div key={integration.name} className="rounded-xl border border-line-subtle p-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{integration.name}</p>
                  <Badge tone={integration.status === "connected" ? "success" : "warning"}>
                    {integration.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted">{integration.note}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="API groups"
          title="Endpoint families"
          description="API surfaces defined in the project blueprint."
        >
          <div className="grid gap-2">
            {integrations.apiGroups.map((group) => (
              <div
                key={group}
                className="rounded-lg border border-line-subtle bg-surface-dim px-4 py-2.5 font-mono text-sm text-foreground"
              >
                {group}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
