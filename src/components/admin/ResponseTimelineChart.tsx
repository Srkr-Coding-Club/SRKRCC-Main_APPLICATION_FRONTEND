'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChartPoint {
  date: string;
  count: number;
}

interface ResponseTimelineChartProps {
  data: ChartPoint[];
}

export default function ResponseTimelineChart({ data }: ResponseTimelineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: '#1A1A2E',
            border: '1px solid #334155',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          itemStyle={{ color: '#FF7A00' }}
          labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
        />
        <Bar dataKey="count" fill="#FF7A00" radius={[4, 4, 0, 0]} maxBarSize={32} name="Responses" />
      </BarChart>
    </ResponsiveContainer>
  );
}
