import { useTranslation } from 'react-i18next';
import { Card } from '../hifi';
import { cn } from '../../lib/cn';

interface Props {
  coveragePercent: number;
  covered: number;
  total: number;
}

/** Step de couverture — barre épaisse + paliers colorés (idée Grace). */
export function CoverageCard({ coveragePercent, covered, total }: Props) {
  const { t } = useTranslation();
  const rounded = Math.round(coveragePercent);
  const uncovered = Math.max(0, total - covered);

  const tone =
    rounded >= 80 ? 'ok' : rounded >= 50 ? 'mid' : rounded > 0 ? 'low' : 'empty';

  const valueClass = {
    ok: 'text-ok',
    mid: 'text-accent',
    low: 'text-warn',
    empty: 'text-text-tertiary',
  }[tone];

  const fillClass = {
    ok: 'bg-ok',
    mid: 'bg-accent',
    low: 'bg-warn',
    empty: 'bg-n-200',
  }[tone];

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-n-500">
          {t('dashboard.coverage')}
        </h3>
        <p className="mt-0.5 text-[12px] text-text-tertiary">
          {t('dashboard.coveredOf', { covered, total })}
        </p>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-4 p-4">
        <div className="flex items-end justify-between gap-3">
          <span className={cn('font-mono text-[40px] font-semibold leading-none tracking-tight', valueClass)}>
            {rounded}
            <span className="text-[20px] text-text-tertiary">%</span>
          </span>
          <div className="flex flex-col items-end gap-1 text-[11px]">
            <span className="inline-flex items-center gap-1.5 rounded-r2 bg-ok-bg px-2 py-0.5 font-medium text-ok">
              <span className="size-1.5 rounded-full bg-ok" />
              {covered} couvertes
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-r2 bg-warn-bg px-2 py-0.5 font-medium text-warn">
              <span className="size-1.5 rounded-full bg-warn" />
              {uncovered} orphelines
            </span>
          </div>
        </div>

        {/* Step track — 4 paliers visuels */}
        <div>
          <div className="relative h-3 overflow-hidden rounded-full bg-n-100">
            <div
              className={cn('h-full rounded-full transition-all duration-500', fillClass)}
              style={{ width: `${rounded}%` }}
            />
            {/* Markers 25 / 50 / 75 */}
            {[25, 50, 75].map((m) => (
              <span
                key={m}
                className="absolute top-0 bottom-0 w-px bg-white/80"
                style={{ left: `${m}%` }}
              />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[9px] font-medium uppercase tracking-wider text-n-400">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
