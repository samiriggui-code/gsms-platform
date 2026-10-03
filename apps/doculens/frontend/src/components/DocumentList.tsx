import { useMemo, useState } from 'react';
import { Clock, FileText, Search } from 'lucide-react';

import type { DocumentEntry } from '../api/types';
import {
  displayLabelName,
  groupDocumentsByPrestation,
  prestationForDocType,
  type PrestationId,
} from '../lib/prestations';
import { cn } from '../lib/utils';
import { inferDueDate, inferRole, inferStatus, formatDateTime } from '../lib/routing';
import { Badge } from './ui/badge';
import { Input } from './ui/input';

export interface DocumentListProps {
  documents: DocumentEntry[];
  onSelect: (document: DocumentEntry) => void;
  selectedId?: string;
  /** When set, only show documents for this prestation (flat list). */
  prestationFilter?: PrestationId | null;
}

export function DocumentList({
  documents,
  onSelect,
  selectedId,
  prestationFilter,
}: DocumentListProps) {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    const trimmed = filter.trim().toLowerCase();
    let pool = documents;
    if (prestationFilter) {
      pool = documents.filter((doc) => prestationForDocType(doc.doc_type) === prestationFilter);
    }
    if (!trimmed) return pool;
    return pool.filter((doc) => {
      const typeLabel = displayLabelName(doc.doc_type ?? '').toLowerCase();
      return (
        (doc.filename ?? '').toLowerCase().includes(trimmed) ||
        (doc.doc_type ?? '').toLowerCase().includes(trimmed) ||
        typeLabel.includes(trimmed) ||
        doc.document_id.toLowerCase().includes(trimmed)
      );
    });
  }, [documents, filter, prestationFilter]);

  const grouped = useMemo(() => {
    if (prestationFilter) return null;
    return groupDocumentsByPrestation(filtered);
  }, [filtered, prestationFilter]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Filter documents"
          placeholder="Rechercher par nom ou type de pièce…"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="h-10 rounded-xl border-border/70 bg-surface-subtle pl-9"
        />
        <Badge variant="outline" className="absolute right-3 top-1/2 -translate-y-1/2 bg-background text-[10px] tabular-nums text-muted-foreground">
          {filtered.length}
        </Badge>
      </div>
      <div className="flex max-h-[56vh] min-h-0 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {grouped
            ? grouped.map(({ prestation, documents: docs }) => (
                <section key={prestation.id} className="space-y-2">
                  <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-background/95 py-1 backdrop-blur-sm">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{prestation.label}</p>
                      <p className="text-[10px] text-muted-foreground">{prestation.description}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px] tabular-nums">
                      {docs.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {docs.map((doc) => (
                      <DocumentRow
                        key={doc.document_id}
                        doc={doc}
                        isSelected={doc.document_id === selectedId}
                        onSelect={onSelect}
                      />
                    ))}
                  </div>
                </section>
              ))
            : filtered.map((doc) => (
                <DocumentRow
                  key={doc.document_id}
                  doc={doc}
                  isSelected={doc.document_id === selectedId}
                  onSelect={onSelect}
                />
              ))}
          {!filtered.length ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-surface-subtle px-4 py-6 text-center text-sm text-muted-foreground">
              Aucun document correspondant.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DocumentRow({
  doc,
  isSelected,
  onSelect,
}: {
  doc: DocumentEntry;
  isSelected: boolean;
  onSelect: (document: DocumentEntry) => void;
}) {
  const uploadedAt = formatDateTime(doc.uploaded_at);
  const assignedRole = inferRole(doc);
  const status = inferStatus(doc);
  const dueAt = formatDateTime(inferDueDate(doc));
  const typeLabel = displayLabelName(doc.doc_type ?? '');

  return (
    <button
      type="button"
      onClick={() => onSelect(doc)}
      className={cn(
        'w-full rounded-xl border border-border/70 bg-background px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        isSelected ? 'border-primary/40 bg-primary/[0.06] shadow-sm ring-1 ring-primary/15' : '',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-subtle text-muted-foreground">
          <FileText className="h-4 w-4" />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {doc.filename ?? doc.document_id}
              </span>
              <Badge variant="outline" className="text-[10px] tracking-wide">
                {doc.doc_type ? typeLabel : 'Non classé'}
              </Badge>
            </div>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> {uploadedAt}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>Rôle : {assignedRole}</span>
            <span>Statut : {status}</span>
            <span>Échéance : {dueAt}</span>
          </div>
          {doc.summary?.summary ? (
            <p className="line-clamp-2 text-sm text-muted-foreground/90">“{doc.summary.summary}”</p>
          ) : (
            <p className="text-xs text-muted-foreground">Résumé en attente</p>
          )}
        </div>
      </div>
    </button>
  );
}
