import { useTranslation } from 'react-i18next';
import { ChartCard, PieChartView, BarChartView, type ChartDatum } from '../hifi';

interface Props {
  title: string;
  data: ChartDatum[];
  type: 'pie' | 'bar';
  subtitle?: string;
}

export function StatusChart({ title, data, type, subtitle }: Props) {
  const { t } = useTranslation();
  const empty = t('common.noData');
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <ChartCard
      title={title}
      subtitle={subtitle ?? (total > 0 ? `${total} éléments` : undefined)}
    >
      {type === 'pie' ? (
        <PieChartView data={data} height={168} empty={empty} />
      ) : (
        <BarChartView data={data} height={160} empty={empty} />
      )}
    </ChartCard>
  );
}
