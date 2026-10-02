import { ArrowUpRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { asList, type CoreResult } from "@/lib/core/client";
import type { Row } from "@/lib/core/types";
import { cn } from "@/lib/utils";
import { CoreFailureState, EmptyState, NoWorkspaceState } from "./core-state";
import { formatValue } from "./format";

export type Column = {
  key: string;
  label: string;
  render?: (row: Row) => ReactNode;
  className?: string;
};

/**
 * Panneau liste générique alimenté par le Core.
 * États : pas de site → invitation à choisir ; Core KO → état explicite ;
 * liste vide → état vide métier ; sinon tableau accessible.
 */
export function ResourcePanel({
  title,
  description,
  result,
  columns,
  empty,
  rowHref,
  actions,
  className,
}: {
  title: string;
  description?: string;
  result: CoreResult<unknown> | null;
  columns: Column[];
  empty: { title: string; description?: string; icon?: LucideIcon; action?: ReactNode };
  rowHref?: (row: Row) => string | null;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {actions}
      </CardHeader>
      <PanelBody result={result} columns={columns} empty={empty} rowHref={rowHref} caption={title} />
    </Card>
  );
}

function PanelBody({
  result,
  columns,
  empty,
  rowHref,
  caption,
}: {
  result: CoreResult<unknown> | null;
  columns: Column[];
  empty: { title: string; description?: string; icon?: LucideIcon; action?: ReactNode };
  rowHref?: (row: Row) => string | null;
  caption: string;
}) {
  if (result === null) return <NoWorkspaceState />;
  if (!result.ok) return <CoreFailureState failure={result} compact />;

  const rows = asList<Row>(result.data);
  if (rows.length === 0) return <EmptyState icon={empty.icon} title={empty.title} description={empty.description} action={empty.action} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border bg-surface-subtle/60">
            {columns.map((column) => (
              <th key={column.key} scope="col" className={cn("px-5 py-2.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground", column.className)}>
                {column.label}
              </th>
            ))}
            {rowHref ? <th scope="col" className="w-10 px-3"><span className="sr-only">Ouvrir</span></th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const href = rowHref?.(row) ?? null;
            return (
              <tr key={String(row.id ?? index)} className="border-b border-border/70 last:border-0 hover:bg-surface-subtle/50">
                {columns.map((column, colIndex) => (
                  <td key={column.key} className={cn("px-5 py-3 align-top", colIndex === 0 && "font-medium", column.className)}>
                    {column.render ? column.render(row) : formatValue(row[column.key])}
                  </td>
                ))}
                {rowHref ? (
                  <td className="px-3 py-3 text-right">
                    {href ? (
                      <Link href={href} className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                        <ArrowUpRight className="size-3.5" aria-hidden />
                        <span className="sr-only">Ouvrir {String(row[columns[0]?.key ?? "id"] ?? "")}</span>
                      </Link>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
