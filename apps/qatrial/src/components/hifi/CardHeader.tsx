import type { ReactNode } from 'react';

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Pastilles de statut affichées sous le titre. */
  pills?: ReactNode;
}

export function CardHeader({ title, subtitle, actions, pills }: CardHeaderProps) {
  return (
    <div className="border-b border-border px-3.5 pt-2.5 pb-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-hifi-title text-text-primary">{title}</div>
          {subtitle && (
            <div className="mt-0.5 text-hifi-sub text-text-tertiary">{subtitle}</div>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
      </div>
      {pills && <div className="mt-2 flex flex-wrap gap-1">{pills}</div>}
    </div>
  );
}
