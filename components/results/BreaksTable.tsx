'use client';

import { useState } from 'react';
import { BreakRow } from '@/lib/scheduling/breaks';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';

const PAGE_SIZE = 100;

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

interface BreaksTableProps {
  breakRows: BreakRow[];
}

export default function BreaksTable({ breakRows }: BreaksTableProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(breakRows.length / PAGE_SIZE);
  const pageRows = breakRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const breakCols = WEEKDAYS.flatMap((wd) => [
    { key: `${wd}_Break_1`, label: `${wd} B1`, type: 'break' as const },
    { key: `${wd}_Lunch`, label: `${wd} Lunch`, type: 'lunch' as const },
    { key: `${wd}_Break_2`, label: `${wd} B2`, type: 'break' as const },
  ]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Showing {page * PAGE_SIZE + 1}–
          {Math.min((page + 1) * PAGE_SIZE, breakRows.length)} of {breakRows.length} agents
        </p>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              ← Prev
            </Button>
            <span className="text-xs text-gray-400 self-center">
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

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-900 sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-20 bg-gray-900 px-3 py-2.5 text-left font-medium text-gray-400 border-r border-gray-800 whitespace-nowrap">
                Agent
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-400 whitespace-nowrap border-r border-gray-800">
                Start
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-400 whitespace-nowrap border-r border-gray-800">
                End
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-400 whitespace-nowrap border-r border-gray-800">
                Off Days
              </th>
              {breakCols.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-2 py-2.5 text-center font-medium whitespace-nowrap',
                    col.type === 'lunch' ? 'text-yellow-400' : 'text-teal-400'
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {pageRows.map((row, idx) => (
              <tr
                key={row.agent}
                className={cn(
                  'hover:bg-gray-800/30 transition-colors',
                  idx % 2 === 0 ? 'bg-gray-950' : 'bg-gray-900/40'
                )}
              >
                <td className="sticky left-0 bg-inherit px-3 py-1.5 font-mono text-brand-400 border-r border-gray-800/50 whitespace-nowrap">
                  {row.agent}
                </td>
                <td className="px-3 py-1.5 text-gray-300 border-r border-gray-800/50 whitespace-nowrap">
                  {row.shiftStart}
                </td>
                <td className="px-3 py-1.5 text-gray-300 border-r border-gray-800/50 whitespace-nowrap">
                  {row.shiftEnd}
                </td>
                <td className="px-3 py-1.5 text-gray-300 border-r border-gray-800/50 whitespace-nowrap">
                  {row.offDays}
                </td>
                {breakCols.map((col) => {
                  const val = row[col.key] ?? '';
                  return (
                    <td
                      key={col.key}
                      className={cn(
                        'px-2 py-1.5 text-center whitespace-nowrap',
                        val
                          ? col.type === 'lunch'
                            ? 'table-cell-lunch'
                            : 'table-cell-break'
                          : 'text-gray-700'
                      )}
                    >
                      {val || '—'}
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
