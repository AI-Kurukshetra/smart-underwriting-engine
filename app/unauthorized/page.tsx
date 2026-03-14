import Link from "next/link";
import { ShieldAlert, Shield } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
            <Shield className="h-5 w-5 text-white" />
          </div>
        </div>

        <div className="card-elevated p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-light">
            <ShieldAlert className="h-6 w-6 text-danger" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Unauthorized</h1>
          <p className="mt-2 text-sm text-muted">
            Your account is authenticated, but it does not have access to this part of the platform.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-strong"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
