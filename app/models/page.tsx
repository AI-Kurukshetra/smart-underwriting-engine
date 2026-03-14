import { AppShell } from "@/components/layout/app-shell";
import { requireProfile } from "@/lib/auth/session";
import { getModelOverview } from "@/lib/repositories/overview";
import { ModelRegistry } from "@/components/models/model-registry";

export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  const profile = await requireProfile(["admin", "analyst"]);
  const models = await getModelOverview(profile.tenantId);

  return (
    <AppShell
      profile={profile}
      currentPath="/models"
      eyebrow="Models"
      title="Model Registry"
      description="Manage active models, run champion-challenger experiments, and monitor model performance across scoring and extraction pipelines."
    >
      <ModelRegistry initialModels={models} />
    </AppShell>
  );
}
