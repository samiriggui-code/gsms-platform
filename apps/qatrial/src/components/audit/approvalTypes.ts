import type { ElectronicSignature } from '../../types';
import type { PillVariant } from '../hifi';

export type ApprovalStatus = 'draft' | 'in_review' | 'approved' | 'rejected';

export interface ApprovalPanelProps {
  entityType: string;
  entityId: string;
  projectId: string;
  currentStatus?: string;
  open: boolean;
  onClose: () => void;
}

export interface ApprovalHistoryEntry {
  id: string;
  action: string;
  userName: string;
  timestamp: string;
  reason?: string;
  signerName?: string;
  meaning?: string;
}

export interface ServerSignatureRecord {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  meaning: ElectronicSignature['meaning'];
  reason: string;
  method: string;
  timestamp: string;
}

export interface ServerApprovalRecord {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reason?: string | null;
  createdAt: string;
  signature?: ServerSignatureRecord | null;
}

export const STATUS_PILL: Record<ApprovalStatus, PillVariant> = {
  draft: 'default',
  in_review: 'accent',
  approved: 'ok',
  rejected: 'bad',
};

export function formatApprovalDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
