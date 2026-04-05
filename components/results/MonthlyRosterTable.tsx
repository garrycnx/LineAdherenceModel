'use client';

import { useState } from 'react';
import { MonthlyRosterRow } from '@/lib/scheduling/types';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';

const PAGE_SIZE = 100;

interface MonthlyRosterTableProps {
  rows: MonthlyRosterRow[];
  dateKeys: string[];
  year: number;
  month: number;
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getCellClass(value: string | number): string {
  const v = String(value);
  if (v === 'OFF') return 'month-cell-off';
  if (v.startsWith('Morning')) return 'month-cell-morning';
  if (v.startsWith('Mid')) return 'month-cell-mid';
  if (v.startsWith('Night')) return 'month-cell-night';
  return 'text-gray-400';
}

function formatDateHeader(dateKey: string): { day: string; wd: string } {
  // dateKey = "YYYY-MM-DD"
  const parts = dateKey.split('-');
  const day = parts[2];
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return { day, wd: DAY_SHORT[date.getDay()] };
}

function abbreviateCell(val: string | number): string {
  const v = String(val);
  if (v === 'OFF') return 'OFF';
  if (v.startsWith('Morning')) return 'MOR';
  if (v.startsWith('Mid')) return 'MID';
  if (v.startsWith('Night')) return 'NGT';
  return v.substring(0, 3);
}

export default function MonthlyRosterTable({
  rows,
  dateKeys,
  year,
  month,
}: MonthlyRosterTableProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-brand-400">
            Monthly Roster — {MONTH_NAMES[month]} {year}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {dateKeys.length} days · {rows.length} agents
          </p>
        </div>
        {totalPages > 1 && (
          <div className="flex gap-2 items-center">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              ← Prev
            </Button>
            <span className="text-xs text-gray-400">
              {page + 1}/{totalPages}
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next →
            </Button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 rounded month-cell-morning">MOR = Morning 06–15</span>
        <span className="px-2 py-1 rounded month-cell-mid">MID = Mid 14–23</span>
        <span className="px-2 py-1 rounded month-cell-night">NGT = Night 22–07</span>
        <span className="px-2 py-1 rounded month-cell-off">OFF = Rest Day</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="min-w-full text-xs border-collapse">
          <thead className="bg-gray-900 sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-20 bg-gray-900 px-3 py-2 text-left font-medium text-gray-400 border-r border-gray-800 whitespace-nowrap min-w-[100px]">
                Agent
              </th>
              <th className="sticky left-[100px] z-20 bg-gray-900 px-2 py-2 text-center font-medium text-gray-400 border-r border-gray-800 whitespace-nowrap">
                Group
              </th>
              {dateKeys.map((dk) => {
                const { day, wd } = formatDateHeader(dk);
                const isWeekend = wd === 'Sat' || wd === 'Sun';
                return (
                  <th
                    key={dk}
                    className={cn(
                      'px-1 py-1 text-center font-medium whitespace-nowrap min-w-[40px]',
                      isWeekend ? 'text-brand-400' : 'text-gray-400'
                    )}
                  >
                    <div>{day}</div>
                    <div className="text-[9px] font-normal text-gray-500">{wd}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {pageRows.map((row, idx) => (
              <tr
                key={row.agent}
                className={cn(
                  'hover:bg-gray-800/20 transition-colors',
                  idx % 2 === 0 ? 'bg-gray-950' : 'bg-gray-900/30'
                )}
              >
                <td className="sticky left-0 bg-inherit px-3 py-1 font-mono text-brand-400 border-r border-gray-800/50 whitespace-nowrap">
                  {row.agent}
                </td>
                <td className="sticky left-[100px] bg-inherit px-2 py-1 text-center text-gray-400 border-r border-gray-800/50">
                  G{(row.shiftGroup as number) + 1}
                </td>
                {dateKeys.map((dk) => {
                  const val = row[dk];
                  const cellClass = getCellClass(val);
                  const display = abbreviateCell(val);
                  return (
                    <td
                      key={dk}
                      className={cn('px-1 py-1 text-center font-medium', cellClass)}
                      title={String(val)}
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
