import Link from "next/link";
import { Fragment } from "react";

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Fil d'Ariane">
      <ol className="flex flex-wrap items-center gap-2 font-mono text-[11px]/4 uppercase tracking-[0.08em] text-muted-foreground">
        {items.map((item, index) => (
          <Fragment key={item.label}>
            {index > 0 ? <li aria-hidden>/</li> : null}
            <li>
              {item.href ? (
                <Link href={item.href} className="hover:text-foreground">
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-foreground">
                  {item.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
