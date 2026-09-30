/**
 * DataTable hifi — densifiée (toolbar, sticky header, lignes riches).
 */
import { useState, type ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { cn } from '../../lib/cn';

export type { ColumnDef };

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  className?: string;
  getRowId?: (row: T) => string;
  /** Recherche globale (filtre toutes les colonnes stringifiables) */
  searchable?: boolean;
  searchPlaceholder?: string;
  toolbar?: ReactNode;
  /** Texte sous le tableau : « N résultats » */
  footerLabel?: (count: number) => string;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  empty,
  className,
  getRowId,
  searchable = false,
  searchPlaceholder = 'Rechercher…',
  toolbar,
  footerLabel,
}: DataTableProps<T>) {
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    globalFilterFn: 'includesString',
  });

  const rows = table.getRowModel().rows;

  if (data.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-r3 border border-border bg-card shadow-sh1',
        className,
      )}
    >
      {(searchable || toolbar) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-secondary/80 px-3 py-2.5">
          {searchable ? (
            <label className="relative min-w-[12rem] flex-1 max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" />
              <input
                type="search"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 w-full rounded-r2 border border-border bg-card pl-8 pr-3 text-[12px] text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
          ) : null}
          {toolbar ? <div className="ml-auto flex items-center gap-2">{toolbar}</div> : null}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse text-left">
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr
                key={hg.id}
                className="border-b border-border bg-n-75 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-n-500"
              >
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="whitespace-nowrap px-3.5 py-2.5 first:pl-4 last:pr-4"
                    style={{
                      width: header.getSize() !== 150 ? header.getSize() : undefined,
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-[13px] text-text-tertiary"
                >
                  Aucun résultat
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <DataTableRow
                  key={row.id}
                  row={row}
                  zebra={index % 2 === 1}
                  clickable={Boolean(onRowClick)}
                  onClick={() => onRowClick?.(row.original)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {footerLabel ? (
        <div className="border-t border-border bg-surface-secondary/60 px-4 py-2 text-[11px] text-text-tertiary">
          {footerLabel(rows.length)}
        </div>
      ) : null}
    </div>
  );
}

function DataTableRow<T>({
  row,
  zebra,
  clickable,
  onClick,
}: {
  row: Row<T>;
  zebra: boolean;
  clickable: boolean;
  onClick: () => void;
}) {
  return (
    <tr
      className={cn(
        'group border-b border-border/80 last:border-0 transition-colors',
        zebra && 'bg-n-50/80',
        clickable && 'cursor-pointer hover:bg-accent-subtle',
      )}
      onClick={clickable ? onClick : undefined}
    >
      {row.getVisibleCells().map((cell, i) => (
        <td
          key={cell.id}
          className={cn(
            'px-3.5 py-3 text-[13px] text-text-secondary first:pl-4 last:pr-4',
            i === 0 &&
              clickable &&
              'relative before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r before:bg-transparent group-hover:before:bg-accent',
          )}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
}
