import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/cn';
import type { HubCardDef } from '../../navigation/hub-config';

/**
 * Card style « sélection type de rapport » :
 * icône à gauche, titre + description — toute la surface cliquable.
 */
export function MenuCard({ title, description, path, icon: Icon, chips, badgeCount }: HubCardDef) {
  const location = useLocation();
  const active =
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <Link
      to={path}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 text-left transition-all',
        active
          ? 'border-accent bg-accent-subtle ring-2 ring-accent/20'
          : 'border-border bg-surface hover:border-accent/40 hover:bg-surface-hover',
      )}
    >
      <div
        className={cn(
          'shrink-0 rounded-lg p-2',
          active ? 'bg-accent text-text-inverse' : 'bg-surface-tertiary text-text-secondary',
        )}
      >
        <Icon className="size-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-medium text-text-primary">{title}</div>
          {badgeCount != null && badgeCount > 0 ? (
            <span className="shrink-0 rounded-md border border-border bg-surface-hover px-1.5 py-0.5 text-[10px] font-semibold text-text-tertiary">
              {badgeCount}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 line-clamp-2 text-xs text-text-tertiary">{description}</div>
        {chips && chips.length > 0 ? (
          <ul className="mt-2 space-y-0.5">
            {chips.slice(0, 4).map((chip) => (
              <li key={chip.label} className="truncate text-[11px] text-text-tertiary/90">
                · {chip.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Link>
  );
}

export function MenuCardsGrid({
  title,
  subtitle,
  cards,
}: {
  title: string;
  subtitle?: string;
  cards: HubCardDef[];
}) {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-text-primary sm:text-2xl">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-sm text-text-tertiary">{subtitle}</p> : null}
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <MenuCard key={card.id} {...card} />
        ))}
      </div>
    </div>
  );
}
