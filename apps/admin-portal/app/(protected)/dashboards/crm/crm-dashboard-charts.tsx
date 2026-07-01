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
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { chartColors, chartTones } from '@ims/shared-ui';

interface BarChartProps {
  data: Array<{ stage: string; count: number }>;
}

export function LeadsByStageChart({ data }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis 
          dataKey="stage" 
          stroke="#94a3b8" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
        />
        <YAxis 
          stroke="#94a3b8" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          }}
          labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
        />
        <Bar 
          dataKey="count" 
          fill={chartColors.primary} 
          radius={[6, 6, 0, 0]} 
          maxBarSize={45}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface PieChartProps {
  data: Array<{ source: string; count: number }>;
}

export function LeadsBySourceChart({ data }: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="source"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={4}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={chartTones[index % chartTones.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          }}
        />
        <Legend 
          verticalAlign="bottom" 
          height={36} 
          iconType="circle"
          formatter={(value: any) => <span className="text-xs text-slate-600 font-semibold">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface CounselorPerformanceProps {
  data: Array<{ counselorId: string | null; counselorName: string; convertedCount: number }>;
}

export function CounselorPerformanceChart({ data }: CounselorPerformanceProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis 
          dataKey="counselorName" 
          stroke="#94a3b8" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
        />
        <YAxis 
          stroke="#94a3b8" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          }}
          labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
        />
        <Bar 
          dataKey="convertedCount" 
          fill={chartColors.success} 
          radius={[6, 6, 0, 0]} 
          maxBarSize={45}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
