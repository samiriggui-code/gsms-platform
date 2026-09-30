import { useTranslation } from 'react-i18next';
import { ShieldAlert, Clock, CheckCircle, XCircle } from 'lucide-react';
import type { ApprovalStatus } from './approvalTypes';

interface ApprovalActionsProps {
  approvalStatus: ApprovalStatus;
  loading: boolean;
  errorMessage: string | null;
  canRequestApproval: boolean;
  canReviewPendingApproval: boolean;
  canRevokePendingApproval: boolean;
  showRejectField: boolean;
  rejectReason: string;
  onRequestApproval: () => void;
  onApprove: () => void;
  onStartReject: () => void;
  onReject: () => void;
  onCancelReject: () => void;
  onRejectReasonChange: (value: string) => void;
  onRevoke: () => void;
}

export function ApprovalActions({
  approvalStatus,
  loading,
  errorMessage,
  canRequestApproval,
  canReviewPendingApproval,
  canRevokePendingApproval,
  showRejectField,
  rejectReason,
  onRequestApproval,
  onApprove,
  onStartReject,
  onReject,
  onCancelReject,
  onRejectReasonChange,
  onRevoke,
}: ApprovalActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      {errorMessage && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {errorMessage}
        </div>
      )}
      {approvalStatus === 'draft' && (
        canRequestApproval ? (
          <button
            onClick={onRequestApproval}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm text-text-inverse bg-accent rounded-lg hover:bg-accent-hover transition-colors font-medium disabled:opacity-50"
          >
            <Clock className="w-4 h-4" />
            {t('approval.requestApproval')}
          </button>
        ) : (
          <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
            Approval requests require edit permission.
          </div>
        )
      )}

      {approvalStatus === 'in_review' && (
        <div className="space-y-2">
          {canReviewPendingApproval && (
            <>
              <button
                onClick={onApprove}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm text-text-inverse bg-success rounded-lg hover:opacity-90 transition-colors font-medium disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                {t('approval.approve')}
              </button>

              {!showRejectField ? (
                <button
                  onClick={onStartReject}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm text-danger bg-danger-subtle rounded-lg hover:bg-danger/20 transition-colors font-medium"
                >
                  <XCircle className="w-4 h-4" />
                  {t('approval.reject')}
                </button>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => onRejectReasonChange(e.target.value)}
                    placeholder={t('approval.rejectReason')}
                    rows={3}
                    className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={onReject}
                      disabled={loading || !rejectReason.trim()}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm text-text-inverse bg-danger rounded-lg hover:opacity-90 transition-colors font-medium disabled:opacity-50"
                    >
                      {t('approval.reject')}
                    </button>
                    <button
                      onClick={onCancelReject}
                      className="px-3 py-2 text-sm text-text-secondary bg-surface-tertiary rounded-lg hover:bg-surface-hover transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {canRevokePendingApproval && (
            <button
              onClick={onRevoke}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm text-danger bg-danger-subtle rounded-lg hover:bg-danger/20 transition-colors font-medium"
            >
              <ShieldAlert className="w-4 h-4" />
              {t('approval.revoke')}
            </button>
          )}

          {!canReviewPendingApproval && !canRevokePendingApproval && (
            <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
              This approval is waiting for an authorized reviewer or the original requester.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
