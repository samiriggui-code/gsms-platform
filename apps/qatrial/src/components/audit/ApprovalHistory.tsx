import { useTranslation } from 'react-i18next';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { formatApprovalDate, type ApprovalHistoryEntry } from './approvalTypes';

interface ApprovalHistoryProps {
  history: ApprovalHistoryEntry[];
}

export function ApprovalHistory({ history }: ApprovalHistoryProps) {
  const { t } = useTranslation();

  if (history.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-text-primary mb-2">{t('approval.history')}</h3>
      <div className="space-y-2">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-2 p-2 rounded-lg bg-surface border border-border-subtle"
          >
            {entry.action === 'approved' || entry.action === 'approve' || entry.meaning === 'approved' ? (
              <CheckCircle className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
            ) : entry.action === 'requested' ? (
              <Clock className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-danger mt-0.5 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm text-text-primary">
                {entry.signerName || entry.userName}
                {' - '}
                <span className="text-text-tertiary capitalize">{entry.meaning || entry.action}</span>
              </p>
              <p className="text-xs text-text-tertiary">{formatApprovalDate(entry.timestamp)}</p>
              {entry.reason && (
                <p className="text-xs text-text-secondary mt-0.5">{entry.reason}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
