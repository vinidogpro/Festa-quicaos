import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function SectionCard({
  title,
  description,
  action,
  className,
  children
}: SectionCardProps) {
  return (
    <section className={cn("ds-section-card", className)}>
      <div className="ds-section-header">
        <div className="min-w-0">
          <h2 className="ds-section-title">{title}</h2>
          {description ? <p className="ds-section-description">{description}</p> : null}
        </div>
        {action ? <div className="w-full sm:w-auto">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
