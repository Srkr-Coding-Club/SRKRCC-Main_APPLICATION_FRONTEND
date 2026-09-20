'use client';

import React, { useEffect, useState } from 'react';
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

function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    setIsDark(root.classList.contains('dark'));

    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains('dark'));
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

export default function ResponseTimelineChart({ data }: ResponseTimelineChartProps) {
  const isDark = useIsDarkMode();
  const gridColor = isDark ? '#1e293b' : '#E2E8F0';
  const axisTextColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipBg = isDark ? '#1A1A2E' : '#FFFFFF';
  const tooltipBorder = isDark ? '#334155' : '#E2E8F0';
  const tooltipLabelColor = isDark ? '#94a3b8' : '#475569';

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: axisTextColor }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: axisTextColor }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: '8px',
            fontSize: '12px',
          }}
          itemStyle={{ color: '#FF7A00' }}
          labelStyle={{ color: tooltipLabelColor, fontWeight: 600 }}
        />
        <Bar dataKey="count" fill="#FF7A00" radius={[4, 4, 0, 0]} maxBarSize={32} name="Responses" />
      </BarChart>
    </ResponsiveContainer>
  );
}
