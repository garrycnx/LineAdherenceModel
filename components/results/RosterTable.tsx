'use client';

import { useState } from 'react';
import { RosterRow } from '@/lib/scheduling/types';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';

const PAGE_SIZE = 100;

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

interface RosterTableProps {
  rosterRows: RosterRow[];
}

export default function RosterTable({ rosterRows }: RosterTableProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rosterRows.length / PAGE_SIZE);
  const pageRows = rosterRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Showing {page * PAGE_SIZE + 1}–
          {Math.min((page + 1) * PAGE_SIZE, rosterRows.length)} of {rosterRows.length} agents
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
              <th className="sticky left-[80px] z-20 bg-gray-900 px-3 py-2.5 text-left font-medium text-gray-400 border-r border-gray-800 whitespace-nowrap">
                Shift Start
              </th>
              <th className="sticky left-[160px] z-20 bg-gray-900 px-3 py-2.5 text-left font-medium text-gray-400 border-r border-gray-800 whitespace-nowrap">
                Shift End
              </th>
              <th className="sticky left-[240px] z-20 bg-gray-900 px-3 py-2.5 text-left font-medium text-gray-400 border-r border-gray-800 whitespace-nowrap">
                Off Days
              </th>
              {WEEKDAYS.map((wd) => (
                <th
                  key={wd}
                  className="px-3 py-2.5 text-center font-medium text-gray-400 whitespace-nowrap"
                >
                  {wd}
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
                <td className="sticky left-0 bg-inherit px-3 py-2 font-mono text-brand-400 border-r border-gray-800/50 whitespace-nowrap">
                  {row.agent}
                </td>
                <td className="sticky left-[80px] bg-inherit px-3 py-2 text-gray-300 border-r border-gray-800/50 whitespace-nowrap">
                  {row.shiftStart}
                </td>
                <td className="sticky left-[160px] bg-inherit px-3 py-2 text-gray-300 border-r border-gray-800/50 whitespace-nowrap">
                  {row.shiftEnd}
                </td>
                <td className="sticky left-[240px] bg-inherit px-3 py-2 text-gray-300 border-r border-gray-800/50 whitespace-nowrap">
                  {row.offDays}
                </td>
                {WEEKDAYS.map((wd) => {
                  const val = row[wd];
                  const isOff = val === 'OFF';
                  return (
                    <td
                      key={wd}
                      className={cn(
                        'px-3 py-2 text-center whitespace-nowrap',
                        isOff
                          ? 'table-cell-off'
                          : 'table-cell-working'
                      )}
                    >
                      {val}
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
