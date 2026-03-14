import { ReactNode } from "react";

type SectionCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionCard({ eyebrow, title, description, action, children, className }: SectionCardProps) {
  return (
    <section className={`card-elevated overflow-hidden ${className ?? ""}`}>
      <div className="flex flex-col gap-3 border-b border-line-subtle px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-5">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
              {eyebrow}
            </p>
          )}
          <h2 className="text-base font-semibold text-foreground sm:text-lg">{title}</h2>
          {description && (
            <p className="mt-1 max-w-xl text-sm text-muted">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}
