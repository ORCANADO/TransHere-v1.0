'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import type { ChartDataPoint } from '@/types/analytics';

interface AnalyticsChartProps {
  data: ChartDataPoint[];
  title?: string;
}

export function AnalyticsChart({ data, title }: AnalyticsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-white/10 rounded-xl p-6">
        <p className="text-muted-foreground text-center">No data available for this period</p>
      </div>
    );
  }

  return (
    <div className="liquid-glass p-4 lg:p-6">
      {title && (
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      )}
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-obsidian-rim)" strokeOpacity={0.3} />
            <XAxis
              dataKey="label"
              stroke="var(--text-obsidian-muted)"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="var(--text-obsidian-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--surface-obsidian-raised)',
                backdropFilter: 'var(--blur-medium)',
                WebkitBackdropFilter: 'var(--blur-medium)',
                border: '1px solid var(--border-obsidian-rim)',
                borderRadius: 'var(--radius-squircle)',
                boxShadow: 'var(--shadow-ao-stack)',
                color: 'var(--text-obsidian-primary)'
              }}
              labelStyle={{ color: 'var(--text-obsidian-muted)' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="visits"
              stroke="#007AFF"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: '#007AFF' }}
              name="Page Views"
            />
            <Line
              type="monotone"
              dataKey="clicks"
              stroke="#AF52DE"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: '#AF52DE' }}
              name="Clicks"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
