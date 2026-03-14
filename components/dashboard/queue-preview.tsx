import Link from "next/link";
import { ArrowRight, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UnderwritingApplication } from "@/lib/domain";

type Props = {
  applications: UnderwritingApplication[];
};

function getStatusTone(status: string) {
  if (status === "approved") return "success" as const;
  if (status === "manual_review") return "warning" as const;
  return "info" as const;
}

export function QueuePreview({ applications }: Props) {
  const items = applications.slice(0, 5);

  return (
    <div className="divide-y divide-line-subtle">
      {items.map((application) => (
        <div
          key={application.id}
          className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-surface-dim sm:gap-4 sm:px-6 sm:py-4"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
              <p className="truncate text-sm font-medium text-foreground">
                {application.applicantName}
              </p>
              <Badge tone={getStatusTone(application.status)}>
                {application.status.replace("_", " ")}
              </Badge>
              {application.flags.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-warning">
                  <AlertTriangle className="h-3 w-3" />
                  {application.flags.length}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted sm:gap-3">
              <span>{application.product}</span>
              <span className="hidden text-line sm:inline">|</span>
              <span>Score {application.riskScore}</span>
              <span className="hidden text-line sm:inline">|</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {application.submittedAt}
              </span>
            </div>
          </div>
          <Link
            href={`/applications/${application.id}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-accent-light hover:text-accent"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ))}

      {items.length === 0 && (
        <div className="px-6 py-8 text-center text-sm text-muted">
          No applications in queue yet.
        </div>
      )}
    </div>
  );
}
