import { redirect } from "next/navigation";
import { Shield, Brain, BarChart3, FileSearch, Workflow, Lock } from "lucide-react";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getCurrentProfile, hasAnyProfiles } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const features = [
  {
    icon: Brain,
    title: "AI Risk Scoring",
    description: "Real-time ML-powered risk assessment across multiple data sources",
  },
  {
    icon: FileSearch,
    title: "Document Intelligence",
    description: "Automated OCR extraction and verification of underwriting evidence",
  },
  {
    icon: Workflow,
    title: "Smart Workflows",
    description: "Configurable decision trees with automated routing and escalation",
  },
  {
    icon: BarChart3,
    title: "Portfolio Analytics",
    description: "Deep risk metrics, concentration analysis, and projection modeling",
  },
  {
    icon: Shield,
    title: "Compliance Engine",
    description: "Built-in regulatory monitoring for GDPR, CCPA, and Fair Credit",
  },
  {
    icon: Lock,
    title: "Fraud Detection",
    description: "Pattern recognition and anomaly detection to flag suspicious claims",
  },
];

export default async function LoginPage() {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect("/");
  }

  const initialized = await hasAnyProfiles();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (user) {
    redirect("/setup");
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden flex-1 overflow-hidden bg-[#0f1117] lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />

        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-accent/20 blur-[120px]" />
        <div className="absolute -right-20 top-20 h-72 w-72 rounded-full bg-indigo-400/10 blur-[100px]" />

        <div className="relative z-10 flex flex-1 flex-col justify-center px-12 py-16 xl:px-20">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent shadow-lg shadow-accent/25">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Aegis</span>
          </div>

          <h1 className="mt-10 max-w-lg text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
            Underwriting intelligence,{" "}
            <span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">
              reimagined.
            </span>
          </h1>

          <p className="mt-5 max-w-md text-base leading-7 text-white/60">
            AI-powered risk assessment that enables faster, more accurate underwriting decisions while reducing bias and improving profitability.
          </p>

          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-sm transition hover:border-white/[0.12] hover:bg-white/[0.06]"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.08]">
                      <Icon className="h-4 w-4 text-indigo-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{feature.title}</p>
                      <p className="mt-0.5 text-xs leading-5 text-white/50">{feature.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 border-t border-white/[0.06] px-12 py-5 xl:px-20">
          <div className="flex flex-col gap-2 text-xs text-white/30 lg:flex-row lg:items-center lg:justify-between">
            <span>Aegis Risk Intelligence Platform</span>
            <div className="flex items-center gap-4">
              <span>SOC 2 Compliant</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>GDPR Ready</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>Enterprise Grade</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:max-w-xl">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">Aegis</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
          <p className="mt-2 text-sm text-muted">
            Sign in to access your underwriting command center.
          </p>

          <div className="mt-8">
            <SignInForm canBootstrap={!initialized} />
          </div>

          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-line" />
              <span className="text-xs text-muted">Platform highlights</span>
              <div className="h-px flex-1 bg-line" />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { value: "< 2s", label: "Avg. decision time" },
                { value: "80%+", label: "Auto-decision rate" },
                { value: "99.9%", label: "Uptime SLA" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border border-line-subtle bg-surface-dim p-3 text-center">
                  <p className="text-lg font-bold text-accent">{stat.value}</p>
                  <p className="mt-0.5 text-[10px] text-muted">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-8 text-center text-[11px] text-muted">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
