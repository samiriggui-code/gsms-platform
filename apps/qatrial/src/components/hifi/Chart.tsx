/**
 * Charts hifi — donut + légende sous le graphe, palette landing.
 */
import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from './Card';
import { cn } from '../../lib/cn';

export type ChartDatum = {
  name: string;
  value: number;
  color?: string;
};

const FALLBACK = ['#4f56e5', '#6c76f8', '#3436a4', '#97a2ff', '#2f7a3d', '#9a6209', '#b02a1a'];

function colorAt(i: number, explicit?: string) {
  return explicit ?? FALLBACK[i % FALLBACK.length];
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; payload?: ChartDatum }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const name = item.payload?.name ?? item.name ?? label;
  const value = item.value ?? 0;
  return (
    <div className="rounded-r2 border border-border bg-card px-2.5 py-1.5 shadow-sh2">
      <p className="text-[11px] font-medium text-text-primary">{name}</p>
      <p className="font-mono text-[12px] text-accent">{value}</p>
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  children,
  className,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <Card className={cn('flex h-full flex-col overflow-hidden', className)}>
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-n-500">
            {title}
          </h3>
          {subtitle ? <p className="mt-0.5 text-[12px] text-text-tertiary">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="flex flex-1 flex-col p-4">{children}</div>
    </Card>
  );
}

/** Légende sous le graphe (pas à côté — évite de compresser le donut). */
function BottomLegend({ data, total }: { data: ChartDatum[]; total: number }) {
  return (
    <ul className="grid w-full grid-cols-1 gap-1.5 sm:grid-cols-3">
      {data.map((d, i) => {
        const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
        return (
          <li
            key={d.name}
            className="flex items-center gap-2 rounded-r2 bg-n-50/80 px-2 py-1.5 text-[12px]"
          >
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: colorAt(i, d.color) }}
            />
            <span className="min-w-0 flex-1 truncate text-text-secondary">{d.name}</span>
            <span className="shrink-0 font-mono text-[11px] text-text-tertiary">{pct}%</span>
            <span className="shrink-0 font-mono text-[12px] font-semibold text-text-primary">
              {d.value}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function PieChartView({
  data,
  height = 180,
  empty,
  showCenterTotal = true,
}: {
  data: ChartDatum[];
  height?: number;
  empty?: ReactNode;
  showCenterTotal?: boolean;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-[12px] text-n-500" style={{ height }}>
        {empty ?? 'Aucune donnée'}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative mx-auto w-full max-w-[200px]" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={54}
              outerRadius={74}
              paddingAngle={3}
              stroke="#fff"
              strokeWidth={2}
            >
              {data.map((entry, i) => (
                <Cell key={entry.name} fill={colorAt(i, entry.color)} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {showCenterTotal ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-[22px] font-semibold tracking-tight text-text-primary">
              {total}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-text-tertiary">Total</span>
          </div>
        ) : null}
      </div>
      <BottomLegend data={data} total={total} />
    </div>
  );
}

export function BarChartView({
  data,
  height = 200,
  empty,
}: {
  data: ChartDatum[];
  height?: number;
  empty?: ReactNode;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-[12px] text-n-500" style={{ height }}>
        {empty ?? 'Aucune donnée'}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#e6e6e4" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#72726e' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#72726e' }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#eef1ff', radius: 4 }} />
            <Bar dataKey="value" radius={[6, 6, 2, 2]} maxBarSize={48}>
              {data.map((entry, i) => (
                <Cell key={entry.name} fill={colorAt(i, entry.color)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <BottomLegend data={data} total={total} />
    </div>
  );
}

export function LineChartView({
  data,
  dataKey = 'value',
  height = 200,
  empty,
}: {
  data: Record<string, string | number>[];
  dataKey?: string;
  height?: number;
  empty?: ReactNode;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-[12px] text-n-500" style={{ height }}>
        {empty ?? 'Aucune donnée'}
      </div>
    );
  }
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f56e5" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#4f56e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="#e6e6e4" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#72726e' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#72726e' }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip content={<ChartTooltip />} />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke="#4f56e5"
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: '#fff', stroke: '#4f56e5', strokeWidth: 2 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
