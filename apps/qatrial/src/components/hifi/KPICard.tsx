import type { ReactNode } from 'react';

import { Card } from './Card';

interface KPICardProps {
  label: string;
  value: ReactNode;
  delta?: { value: string; tone: 'ok' | 'bad' | 'neutral' };
  sub?: ReactNode;
  /** Contenu sous la ligne delta/sub — ex. barre de progression. */
  footer?: ReactNode;
  onClick?: () => void;
  className?: string;
}

const DELTA_TONE = {
  ok: 'text-ok',
  bad: 'text-bad',
  neutral: 'text-n-500',
} as const;

/**
 * Carte de chiffre clé — gabarit Grace : padding serré, valeur 24px tracking −0.8px,
 * libellé 10px monospace. Remplace les anciennes cartes `p-6` / `text-4xl`.
 */
export function KPICard({ label, value, delta, sub, footer, onClick, className = '' }: KPICardProps) {
  const body = (
    <>
      <div className="text-hifi-label font-mono uppercase text-n-500">{label}</div>
      <div className="mt-1.5 text-hifi-kpi text-n-900">{value}</div>
      {(delta || sub) && (
        <div className="mt-1.5 flex items-center gap-2">
          {delta && (
            <span className={`text-hifi-meta font-mono font-semibold ${DELTA_TONE[delta.tone]}`}>
              {delta.value}
            </span>
          )}
          {sub && <span className="text-hifi-meta text-n-500">{sub}</span>}
        </div>
      )}
      {footer && <div className="mt-2">{footer}</div>}
    </>
  );

  return (
    <Card
      className={[
        'px-3.5 py-3',
        onClick ? 'cursor-pointer transition-shadow hover:shadow-sh2' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {onClick ? (
        <button type="button" onClick={onClick} className="block w-full text-left">
          {body}
        </button>
      ) : (
        body
      )}
    </Card>
  );
}
