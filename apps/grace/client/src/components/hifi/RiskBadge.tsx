import { useT } from '../../i18n';

export type RiskLevel = 'Negligible' | 'Low' | 'Moderate' | 'High' | 'Extreme';

const STYLES: Record<RiskLevel, string> = {
  Negligible: 'bg-r-neg text-r-negInk',
  Low: 'bg-r-low text-r-lowInk',
  Moderate: 'bg-r-mod text-r-modInk',
  High: 'bg-r-high text-r-highInk',
  Extreme: 'bg-r-ext text-r-extInk',
};

interface RiskBadgeProps {
  level: RiskLevel;
  /** Optional secondary code (priority / IRV band). Translated when known. */
  value?: string | number;
  block?: boolean;
}

function translateBadgeValue(
  t: (key: string, vars?: Record<string, string | number>) => string,
  value: string | number,
): string {
  if (typeof value === 'number') return String(value);
  for (const prefix of ['enum.riskPriority.', 'enum.irvBand.', 'enum.vulnerabilityRating.'] as const) {
    const key = `${prefix}${value}`;
    const label = t(key);
    if (label !== key) return label;
  }
  return value;
}

export function RiskBadge({ level, value, block }: RiskBadgeProps) {
  const t = useT();
  const levelLabel = t(`enum.riskLevel.${level}`);
  const valueLabel = value != null ? translateBadgeValue(t, value) : null;
  return (
    <span
      aria-label={t('enum.riskLevel.aria', { level: levelLabel })}
      className={[
        'inline-flex items-center justify-center gap-1 text-[10.5px] font-semibold rounded-[3px] px-2 py-0.5',
        STYLES[level],
        block ? 'w-full py-1' : '',
      ].join(' ')}
    >
      {levelLabel}
      {valueLabel != null && <span className="font-mono opacity-80">· {valueLabel}</span>}
    </span>
  );
}
