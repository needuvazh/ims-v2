'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
} from '@ims/shared-ui';

interface ResolvedOperatingDay {
  dayOfWeek: string;
  isOpen: boolean;
  workingHours: { startTime: string; endTime: string }[];
}

interface Holiday {
  id: string;
  businessCalendarId: string;
  branchId: string | null;
  date: Date | string;
  name: string;
  holidayType: string;
  description?: string | null;
}

interface WorkingDaysCalendarProps {
  resolvedOperatingDays: ResolvedOperatingDay[];
  holidays: Holiday[];
  selectedBranchId: string | null;
  branchLabel: string;
}

export function WorkingDaysCalendar({
  resolvedOperatingDays,
  holidays,
  selectedBranchId,
  branchLabel,
}: WorkingDaysCalendarProps) {
  // Use today or calendar's active year as initial date
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [hoveredDateStr, setHoveredDateStr] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Filter holidays to only display global holidays or those matching selectedBranchId
  const activeHolidays = useMemo(() => {
    return holidays.filter(
      (h) => h.branchId === null || h.branchId === selectedBranchId,
    );
  }, [holidays, selectedBranchId]);

  // Generate grid days for the selected month
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Day of the week of the 1st day (0 = Sunday, 6 = Saturday)
    const startPadding = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const dayList = [];

    // Add empty padding days for the start of the month
    for (let i = 0; i < startPadding; i++) {
      dayList.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      dayList.push(date);
    }

    return dayList;
  }, [year, month]);

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const dayOfWeekNames = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ];

  // Helper to compare dates ignoring time
  const getHolidayForDate = (date: Date) => {
    return activeHolidays.find((h) => {
      const hDate = new Date(h.date);
      return (
        hDate.getFullYear() === date.getFullYear() &&
        hDate.getMonth() === date.getMonth() &&
        hDate.getDate() === date.getDate()
      );
    });
  };

  return (
    <Card className="border-[color:var(--ims-border)] bg-white">
      <CardHeader className="bg-[color:var(--ims-surface-hover)] border-b border-[color:var(--ims-border)] flex flex-row items-center justify-between py-4 rounded-t-xl">
        <div>
          <CardTitle className="text-base flex items-center gap-2 font-bold text-slate-800">
            <Calendar className="h-5 w-5 text-indigo-600" />
            Working Days Calendar
          </CardTitle>
          <CardDescription className="text-xs">
            Visual month-by-month schedule for{' '}
            <span className="font-semibold text-slate-700">{branchLabel}</span>
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600"
            title="Previous Month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-bold text-slate-800 min-w-[100px] text-center">
            {monthName} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600"
            title="Next Month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div
              key={d}
              className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((date, idx) => {
            if (!date) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="aspect-square bg-slate-50/50 rounded-xl border border-dashed border-slate-100/50"
                />
              );
            }

            const dayName = dayOfWeekNames[date.getDay()];
            const operatingConfig = resolvedOperatingDays.find(
              (d) => d.dayOfWeek === dayName,
            );
            const holiday = getHolidayForDate(date);

            const isClosed = !operatingConfig?.isOpen;
            const isHoliday = !!holiday;
            const isWorking = !isClosed && !isHoliday;

            // Compute styling classes
            let bgClass = 'bg-slate-50/30 border-slate-100 hover:bg-slate-50';
            let textClass = 'text-slate-700';
            let statusText = 'Working Day';
            let statusBadge = '';

            if (isHoliday) {
              bgClass = 'bg-amber-50/60 border-amber-200 hover:bg-amber-50';
              textClass = 'text-amber-800';
              statusText = holiday.name;
              statusBadge = 'Holiday';
            } else if (isClosed) {
              bgClass = 'bg-rose-50/40 border-rose-100 hover:bg-rose-50';
              textClass = 'text-rose-700';
              statusText = 'Closed';
              statusBadge = 'Weekend/Closed';
            } else {
              bgClass =
                'bg-emerald-50/30 border-emerald-100 hover:bg-emerald-50/60';
              textClass = 'text-emerald-800';
              const hours = operatingConfig?.workingHours
                ?.map((w) => `${w.startTime}-${w.endTime}`)
                .join(', ');
              statusText = hours || 'Open';
              statusBadge = 'Working';
            }

            return (
              <div
                key={date.toISOString()}
                onMouseEnter={() => setHoveredDateStr(date.toISOString())}
                onMouseLeave={() => setHoveredDateStr(null)}
                className={`aspect-square p-2 border rounded-xl flex flex-col justify-between transition-all relative cursor-help ${bgClass}`}
              >
                <span className={`text-xs font-bold ${textClass}`}>
                  {date.getDate()}
                </span>

                {/* Micro visual indicator badge */}
                <div className="w-full truncate text-[9px] font-semibold text-center mt-1">
                  {isHoliday ? (
                    <span className="inline-flex items-center px-1 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200 max-w-full truncate">
                      {holiday.name}
                    </span>
                  ) : isClosed ? (
                    <span className="text-rose-500 font-medium">Closed</span>
                  ) : (
                    <span className="text-emerald-600 font-medium text-[9px]">
                      {statusText}
                    </span>
                  )}
                </div>

                {/* State-based Hover Tooltip */}
                {hoveredDateStr === date.toISOString() && (
                  <div className="absolute z-30 bg-slate-900 text-white text-xs rounded-xl p-3 w-52 shadow-xl -top-2 left-1/2 -translate-y-full -translate-x-1/2 pointer-events-none before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-slate-900 border border-slate-800">
                    <p className="font-bold border-b border-slate-800 pb-1 mb-1 text-[10px] uppercase tracking-wider text-slate-400">
                      {date.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="font-bold flex items-center gap-1.5 text-white mb-0.5">
                      {isHoliday ? (
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                      ) : isClosed ? (
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      )}
                      {statusBadge}
                    </p>
                    <div className="text-slate-300 text-[11px] font-medium leading-relaxed">
                      {isHoliday ? (
                        <>
                          <span className="font-semibold text-amber-400">
                            {holiday.name}
                          </span>
                          {holiday.description && (
                            <span className="block mt-1 text-[10px] text-slate-400 italic">
                              "{holiday.description}"
                            </span>
                          )}
                        </>
                      ) : isClosed ? (
                        'Weekly Rest / Closed Day'
                      ) : (
                        <>
                          Working hours:{' '}
                          <span className="font-semibold text-emerald-400">
                            {statusText}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 border border-emerald-600/10" />
            Working Day
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 border border-rose-600/10" />
            Weekend / Closed
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 border border-amber-600/10" />
            Holiday
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
