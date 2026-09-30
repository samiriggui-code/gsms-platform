import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '../hifi';

interface WidgetData {
  labels: string[];
  values: number[];
  total?: number;
}

interface Widget {
  id: string;
  type: string; // counter, trend, bar, pie, table, gauge
  title: string;
  dataSource: string;
  metric: string;
  groupBy?: string | null;
  size: string; // small, medium, large
}

interface Props {
  widget: Widget;
  data: WidgetData;
}

const CHART_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
];

export function KPIWidgetCard({ widget, data }: Props) {
  const { t } = useTranslation();

  const sizeClass = widget.size === 'large' ? 'md:col-span-2' : '';

  const chartData = data.labels.map((label, i) => ({
    name: label,
    value: data.values[i] || 0,
  }));

  const renderContent = () => {
    switch (widget.type) {
      case 'counter':
        return renderCounter();
      case 'trend':
        return renderTrend();
      case 'bar':
        return renderBar();
      case 'pie':
        return renderPie();
      case 'table':
        return renderTable();
      case 'gauge':
        return renderGauge();
      default:
        return <div className="text-text-tertiary text-sm">{t('kpi.unknownWidgetType')}</div>;
    }
  };

  const renderCounter = () => {
    const value = data.total ?? (data.values.length > 0 ? data.values[0] : 0);
    const label = data.labels.length > 0 ? data.labels[0] : widget.metric;
    // Simple trend simulation: compare first and last value if multiple
    let trendDir: 'up' | 'down' | 'flat' = 'flat';
    if (data.values.length >= 2) {
      const last = data.values[data.values.length - 1];
      const prev = data.values[data.values.length - 2];
      if (last > prev) trendDir = 'up';
      else if (last < prev) trendDir = 'down';
    }

    return (
      <div className="flex h-full flex-col items-center justify-center py-2">
        <div className="text-hifi-kpi text-n-900">{value.toLocaleString()}</div>
        <div className="mt-1 text-hifi-label font-mono uppercase text-n-500">{label}</div>
        <div className={`mt-1.5 flex items-center gap-1 text-hifi-meta font-mono font-semibold ${
          trendDir === 'up' ? 'text-ok' : trendDir === 'down' ? 'text-bad' : 'text-n-500'
        }`}>
          {trendDir === 'up' && <TrendingUp className="h-3 w-3" />}
          {trendDir === 'down' && <TrendingDown className="h-3 w-3" />}
          {trendDir === 'flat' && <Minus className="h-3 w-3" />}
          {trendDir === 'up' ? t('kpi.trendUp') : trendDir === 'down' ? t('kpi.trendDown') : t('kpi.trendFlat')}
        </div>
      </div>
    );
  };

  const renderTrend = () => {
    if (chartData.length === 0) return <EmptyChart />;
    return (
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--color-text-tertiary, #9ca3af)" />
          <YAxis tick={{ fontSize: 10 }} stroke="var(--color-text-tertiary, #9ca3af)" />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderBar = () => {
    if (chartData.length === 0) return <EmptyChart />;
    return (
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--color-text-tertiary, #9ca3af)" />
          <YAxis tick={{ fontSize: 10 }} stroke="var(--color-text-tertiary, #9ca3af)" />
          <Tooltip />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderPie = () => {
    if (chartData.length === 0 || chartData.every((d) => d.value === 0)) return <EmptyChart />;
    return (
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={35}
            outerRadius={70}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }: any) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderTable = () => {
    if (chartData.length === 0) return <EmptyChart />;
    return (
      <div className="overflow-auto max-h-[200px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-1.5 px-2 text-text-secondary font-medium text-xs">{t('kpi.label')}</th>
              <th className="text-right py-1.5 px-2 text-text-secondary font-medium text-xs">{t('kpi.value')}</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="py-1.5 px-2 text-text-primary text-xs">{row.name}</td>
                <td className="py-1.5 px-2 text-text-primary text-xs text-right font-medium">{row.value.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          {data.total != null && (
            <tfoot>
              <tr className="border-t border-border">
                <td className="py-1.5 px-2 text-text-primary text-xs font-semibold">{t('kpi.total')}</td>
                <td className="py-1.5 px-2 text-text-primary text-xs text-right font-semibold">{data.total.toLocaleString()}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  const renderGauge = () => {
    const value = Math.min(100, Math.max(0, data.total ?? (data.values[0] || 0)));
    const angle = (value / 100) * 180;
    const radians = (angle * Math.PI) / 180;
    const x = 60 + 45 * Math.cos(Math.PI - radians);
    const y = 65 - 45 * Math.sin(Math.PI - radians);

    const color = value >= 80 ? '#22c55e' : value >= 50 ? '#f59e0b' : '#ef4444';

    return (
      <div className="flex flex-col items-center justify-center py-2">
        <svg width="120" height="80" viewBox="0 0 120 80">
          {/* Background arc */}
          <path
            d="M 15 65 A 45 45 0 0 1 105 65"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            d={`M 15 65 A 45 45 0 ${angle > 90 ? 1 : 0} 1 ${x} ${y}`}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Center text */}
          <text x="60" y="62" textAnchor="middle" fill="currentColor" fontSize="16" fontWeight="bold">
            {value}%
          </text>
        </svg>
        <div className="text-xs text-text-secondary mt-1">{data.labels[0] || widget.metric}</div>
      </div>
    );
  };

  return (
    <Card className={`px-3.5 py-3 ${sizeClass}`}>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="truncate text-hifi-title text-n-900">{widget.title}</h4>
        <span className="rounded-r1 bg-n-100 px-1.5 py-px text-hifi-pill font-mono text-n-500">
          {widget.dataSource} / {widget.metric}
        </span>
      </div>
      {renderContent()}
    </Card>
  );
}

function EmptyChart() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center h-[180px] text-text-tertiary text-sm">
      {t('kpi.noData')}
    </div>
  );
}
