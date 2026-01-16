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
    <div className="bg-card border border-white/10 rounded-xl p-4 lg:p-6">
      {title && (
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      )}
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="label"
              stroke="#94A3B8"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="#94A3B8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0A1221',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff'
              }}
              labelStyle={{ color: '#94A3B8' }}
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
