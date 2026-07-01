'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './card';
import { cn } from '../utils/cn';

export interface ChartWidgetProps {
  title: string;
  description?: string;
  className?: string;
  ariaLabel: string;
  children: React.ReactNode;
}

export const chartColors = {
  primary: '#4f46e5', // indigo-600
  secondary: '#0ea5e9', // sky-500
  success: '#10b981', // emerald-500
  warning: '#f59e0b', // amber-500
  error: '#ef4444', // red-500
  muted: '#64748b', // slate-500
  violet: '#8b5cf6', // violet-500
  pink: '#ec4899', // pink-500
  teal: '#14b8a6', // teal-500
  orange: '#f97316', // orange-500
};

export const chartTones = [
  chartColors.primary,
  chartColors.secondary,
  chartColors.success,
  chartColors.warning,
  chartColors.violet,
  chartColors.teal,
  chartColors.orange,
  chartColors.pink,
];

/** Standardized, themeable and accessible wrapper for dashboard charts */
export function ChartWidget({
  title,
  description,
  className,
  ariaLabel,
  children,
}: ChartWidgetProps) {
  return (
    <Card className={cn('flex flex-col overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px] w-full flex items-center justify-center p-6 pt-2">
        <div 
          className="w-full h-full min-h-[280px] flex items-center justify-center" 
          role="img" 
          aria-label={ariaLabel}
        >
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
