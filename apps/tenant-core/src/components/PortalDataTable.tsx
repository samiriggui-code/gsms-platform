import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type PortalColumn<T> = {
  id: string;
  header: string;
  className?: string;
  cell: (row: T) => ReactNode;
};

type PortalDataTableProps<T> = {
  columns: PortalColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  className?: string;
};

/** Table listes portail — colonnes + en-tête, pas une pile de cards. */
export function PortalDataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  className,
}: PortalDataTableProps<T>) {
  if (!rows.length) {
    return (
      <div className={cn("px-6 py-16 text-center", className)}>
        {empty ?? (
          <p className="text-sm text-muted-foreground">
            {/* fallback — pages pass empty; keep FR/EN via caller */}
            —
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border/70 bg-surface-subtle/80">
            {columns.map((col) => (
              <th
                key={col.id}
                scope="col"
                className={cn(
                  "px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:px-6",
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-b border-border/60 last:border-b-0 hover:bg-surface-subtle/50"
            >
              {columns.map((col) => (
                <td
                  key={col.id}
                  className={cn("px-5 py-3.5 align-middle sm:px-6", col.className)}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
