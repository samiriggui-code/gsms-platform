import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { StatusBadge } from '../shared/StatusBadge';
import { Card } from '../hifi';
import type { Requirement } from '../../types';
import { buildCodeMap } from '../../lib/displayId';

interface Props {
  requirements: Requirement[];
}

export function OrphanedRequirements({ requirements }: Props) {
  const { t } = useTranslation();
  const codes = useMemo(() => buildCodeMap(requirements, 'REQ'), [requirements]);

  return (
    <Card>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex size-6 items-center justify-center rounded-md bg-warning-subtle">
          <AlertCircle className="size-3.5 text-warning" />
        </div>
        <h3 className="text-sm font-semibold text-text-primary">
          {t('dashboard.orphanedReqs', { count: requirements.length })}
        </h3>
      </div>
      {requirements.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-text-tertiary">
          {t('dashboard.orphanedReqsEmpty')}
        </div>
      ) : (
        <div className="divide-y divide-border-subtle">
          {requirements.map((req) => (
            <div
              key={req.id}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-hover"
            >
              <span className="w-16 shrink-0 font-mono text-xs font-semibold text-accent">
                {codes.get(req.id)}
              </span>
              <span className="flex-1 truncate text-sm text-text-primary">{req.title}</span>
              <StatusBadge status={req.status} type="requirement" />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
