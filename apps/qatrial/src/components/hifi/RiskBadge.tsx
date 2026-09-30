import { useTranslation } from 'react-i18next';

export type RiskLevel = 'Negligible' | 'Low' | 'Moderate' | 'High' | 'Extreme';

const STYLES: Record<RiskLevel, string> = {
  Negligible: 'bg-r-neg text-r-neg-ink',
  Low: 'bg-r-low text-r-low-ink',
  Moderate: 'bg-r-mod text-r-mod-ink',
  High: 'bg-r-high text-r-high-ink',
  Extreme: 'bg-r-ext text-r-ext-ink',
};

interface RiskBadgeProps {
  level: RiskLevel;
  /** Code secondaire (priorité, bande IRV). Traduit si la clé existe. */
  value?: string | number;
  /** Occupe toute la largeur — utile en cellule de matrice. */
  block?: boolean;
}

export function RiskBadge({ level, value, block }: RiskBadgeProps) {
  const { t } = useTranslation();

  // Les clés `risk.*` n'existent pas encore dans les catalogues QAtrial :
  // `defaultValue` évite d'afficher la clé brute en attendant qu'elles soient
  // ajoutées à public/locales/{en,fr}/common.json.
  const levelLabel = t(`risk.level.${level}`, { defaultValue: level });
  const valueLabel =
    value != null
      ? typeof value === 'number'
        ? String(value)
        : t(`risk.value.${value}`, { defaultValue: value })
      : null;

  return (
    <span
      aria-label={levelLabel}
      className={[
        'inline-flex items-center justify-center gap-1 rounded-r1 px-2 py-0.5 text-hifi-pill font-semibold',
        STYLES[level],
        block ? 'w-full py-1' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {levelLabel}
      {valueLabel != null && <span className="font-mono opacity-80">· {valueLabel}</span>}
    </span>
  );
}
