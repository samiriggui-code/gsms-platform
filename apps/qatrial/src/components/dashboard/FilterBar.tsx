import { useTranslation } from 'react-i18next';
import { REQUIREMENT_STATUSES, TEST_STATUSES } from '../../lib/constants';
import type { DashboardFilters } from '../../types';
import { Card } from '../hifi';

interface Props {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
}

const selectClass =
  'h-7 rounded-r1 border border-border bg-card px-2 text-[11.5px] text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30';

export function FilterBar({ filters, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <Card className="flex flex-wrap items-center gap-3 px-3 py-2.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-n-500">
        Filtres
      </span>
      <div className="flex items-center gap-1.5">
        <label className="text-[11.5px] text-text-tertiary">{t('dashboard.reqStatus')}</label>
        <select
          value={filters.requirementStatus}
          onChange={(e) =>
            onChange({
              ...filters,
              requirementStatus: e.target.value as DashboardFilters['requirementStatus'],
            })
          }
          className={selectClass}
        >
          <option value="All">{t('common.all')}</option>
          {REQUIREMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`statuses.${s}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1.5">
        <label className="text-[11.5px] text-text-tertiary">{t('dashboard.testStatus')}</label>
        <select
          value={filters.testStatus}
          onChange={(e) =>
            onChange({
              ...filters,
              testStatus: e.target.value as DashboardFilters['testStatus'],
            })
          }
          className={selectClass}
        >
          <option value="All">{t('common.all')}</option>
          {TEST_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`statuses.${s}`)}
            </option>
          ))}
        </select>
      </div>
    </Card>
  );
}
