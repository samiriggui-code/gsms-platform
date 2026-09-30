import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  FileText,
  ChevronDown,
  ChevronRight,
  Clock,
  ShieldCheck,
  Inbox,
} from 'lucide-react';
import { useAppMode } from '../../hooks/useAppMode';
import { useProjectStore } from '../../store/useProjectStore';
import { useAuditStore } from '../../store/useAuditStore';
import { useApiAudit } from '../../hooks/useApiAudit';
import { getProjectId } from '../../lib/projectUtils';
import type { AuditEntry } from '../../types';
import { Pill, type PillVariant } from '../hifi';

interface Props {
  entityId?: string;
}

const ACTION_PILL: Record<string, PillVariant> = {
  create: 'info',
  login: 'info',
  update: 'accent',
  link: 'accent',
  sign: 'accent',
  ai_generate: 'accent',
  delete: 'bad',
  reject: 'bad',
  ai_reject: 'bad',
  approve: 'ok',
  ai_accept: 'ok',
  status_change: 'default',
  export: 'default',
  generate_report: 'default',
  unlink: 'default',
  logout: 'default',
  import: 'default',
};

function humanizeAction(action: string): string {
  return action.replace(/_/g, ' ');
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }) +
    ' ' +
    d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  );
}

function toDateInputValue(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Affiche type + id tronqué — les UUID complets faisaient déborder la page. */
function EntityRef({ type, id }: { type: string; id: string }) {
  const short =
    id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
  return (
    <span className="min-w-0 max-w-[14rem] truncate font-mono text-[11px] text-text-tertiary" title={`${type}/${id}`}>
      {type}/{short}
    </span>
  );
}

export function AuditTrailViewer({ entityId }: Props) {
  const { t } = useTranslation();
  const { mode } = useAppMode();
  const isServerMode = mode === 'server';
  const project = useProjectStore((s) => s.project);
  const projectId = getProjectId(project);
  const allEntries = useAuditStore((s) => s.entries);
  const auditApi = useApiAudit(isServerMode ? projectId : '');
  const sourceEntries = isServerMode && projectId ? auditApi.entries : allEntries;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [dateFrom, setDateFrom] = useState(toDateInputValue(thirtyDaysAgo));
  const [dateTo, setDateTo] = useState(toDateInputValue(now));
  const [expandedDiffs, setExpandedDiffs] = useState<Set<string>>(new Set());

  const filteredEntries = useMemo(() => {
    let entries = entityId
      ? sourceEntries.filter((e) => e.entityId === entityId)
      : sourceEntries;

    const from = new Date(dateFrom + 'T00:00:00').getTime();
    const to = new Date(dateTo + 'T23:59:59').getTime();

    entries = entries.filter((e) => {
      const ts = new Date(e.timestamp).getTime();
      return ts >= from && ts <= to;
    });

    return [...entries].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [dateFrom, dateTo, entityId, sourceEntries]);

  const toggleDiff = (id: string) => {
    setExpandedDiffs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportCSV = () => {
    if (isServerMode && projectId) {
      void auditApi.exportCsv();
      return;
    }

    const headers = [
      'Timestamp',
      'Action',
      'User',
      'Entity Type',
      'Entity ID',
      'Previous Value',
      'New Value',
      'Reason',
      'Signature Meaning',
      'Signer',
    ];
    const rows = filteredEntries.map((e) => [
      e.timestamp,
      e.action,
      e.userName,
      e.entityType,
      e.entityId,
      e.previousValue ?? '',
      e.newValue ?? '',
      e.reason ?? '',
      e.signature?.meaning ?? '',
      e.signature?.signerName ?? '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    window.print();
  };

  const getActionLabel = (action: string): string => {
    const translated = t(`audit.actions.${action}`);
    return translated === `audit.actions.${action}` ? humanizeAction(action) : translated;
  };

  const renderDiff = (entry: AuditEntry) => {
    if (!entry.previousValue && !entry.newValue) return null;
    const isExpanded = expandedDiffs.has(entry.id);

    return (
      <div className="mt-1.5 min-w-0">
        <button
          type="button"
          onClick={() => toggleDiff(entry.id)}
          className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent-hover"
        >
          {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          {t('audit.viewDiff')}
        </button>
        {isExpanded ? (
          <div className="mt-1.5 max-w-full overflow-x-auto rounded-r2 border border-border bg-n-50 p-2.5 font-mono text-[11px]">
            {entry.previousValue ? (
              <div className="min-w-0">
                <span className="font-medium text-bad">- Previous:</span>
                <pre className="mt-0.5 whitespace-pre-wrap break-all text-text-secondary">
                  {entry.previousValue}
                </pre>
              </div>
            ) : null}
            {entry.newValue ? (
              <div className="mt-1.5 min-w-0">
                <span className="font-medium text-ok">+ New:</span>
                <pre className="mt-0.5 whitespace-pre-wrap break-all text-text-secondary">
                  {entry.newValue}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  const renderSignature = (entry: AuditEntry) => {
    if (!entry.signature) return null;
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-text-secondary">
        <ShieldCheck className="size-3.5 shrink-0 text-accent" />
        <span>
          {t('audit.signedBy', {
            meaning: t(`signature.${entry.signature.meaning}`),
            name: entry.signature.signerName,
          })}
        </span>
        <span className="text-text-tertiary">({entry.signature.method})</span>
      </div>
    );
  };

  return (
    <div className="min-w-0 space-y-3 overflow-x-hidden print:space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 rounded-r2 border border-input-border bg-input-bg px-2 text-[12px] text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <span className="text-[12px] text-text-tertiary">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 rounded-r2 border border-input-border bg-input-bg px-2 text-[12px] text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex h-8 items-center gap-1 rounded-r2 border border-border bg-card px-2.5 text-[12px] text-text-secondary hover:bg-surface-hover"
          >
            <Download className="size-3.5" />
            CSV
          </button>
          <button
            type="button"
            onClick={exportPDF}
            className="inline-flex h-8 items-center gap-1 rounded-r2 border border-border bg-card px-2.5 text-[12px] text-text-secondary hover:bg-surface-hover"
          >
            <FileText className="size-3.5" />
            PDF
          </button>
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
          <Inbox className="mb-2 size-8" />
          <p className="text-[12.5px] font-medium">{t('common.noData')}</p>
        </div>
      ) : (
        <div className="relative min-w-0">
          <div className="absolute bottom-0 left-3.5 top-0 w-px bg-border print:hidden" />

          <div className="space-y-0">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="relative flex min-w-0 gap-3 pb-3">
                <div className="relative z-10 mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-surface bg-n-100">
                  {entry.signature ? (
                    <div className="flex size-7 items-center justify-center rounded-full bg-accent">
                      <ShieldCheck className="size-3.5 text-white" />
                    </div>
                  ) : (
                    <Clock className="size-3.5 text-text-tertiary" />
                  )}
                </div>

                <div className="min-w-0 flex-1 overflow-hidden rounded-r2 border border-border bg-card p-2.5 shadow-sh1">
                  <div className="mb-1 flex min-w-0 flex-wrap items-center gap-1.5">
                    <Pill variant={ACTION_PILL[entry.action] ?? 'default'}>
                      {getActionLabel(entry.action)}
                    </Pill>
                    <EntityRef type={entry.entityType} id={entry.entityId} />
                    <span className="ml-auto shrink-0 text-[11px] text-text-tertiary">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </div>

                  <p className="truncate text-[12.5px] text-text-secondary">{entry.userName}</p>

                  {entry.reason ? (
                    <div className="mt-1 text-[11.5px] text-text-secondary">
                      <span className="font-medium text-text-primary">{t('audit.reason')}:</span>{' '}
                      <span className="break-words">{entry.reason}</span>
                    </div>
                  ) : null}

                  {(entry.previousValue || entry.newValue) && renderDiff(entry)}
                  {renderSignature(entry)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
