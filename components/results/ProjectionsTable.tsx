'use client';

import { ProjectionRow } from '@/lib/scheduling/types';
import { cn } from '@/lib/utils';

interface ProjectionsTableProps {
  projectionRows: ProjectionRow[];
  mode: 'sla' | 'la';
  slaPct?: number;
}

export default function ProjectionsTable({
  projectionRows,
  mode,
  slaPct = 80,
}: ProjectionsTableProps) {
  if (mode === 'sla') {
    return (
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-900">
            <tr>
              {['Day', 'Total Calls', 'Projected SLA%', 'Projected Abandon%', 'Avg Occupancy%'].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-medium text-gray-400 whitespace-nowrap"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {projectionRows.map((row, idx) => {
              const sla = row.projectedSlaPct ?? 0;
              const slaOk = sla >= slaPct;
              const slaClose = sla >= slaPct * 0.95 && !slaOk;

              return (
                <tr
                  key={row.day}
                  className={cn(
                    'hover:bg-gray-800/30 transition-colors',
                    idx % 2 === 0 ? 'bg-gray-950' : 'bg-gray-900/40'
                  )}
                >
                  <td className="px-4 py-2.5 font-semibold text-gray-200">{row.day}</td>
                  <td className="px-4 py-2.5 text-gray-300">
                    {(row.totalCalls ?? 0).toLocaleString()}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-2.5 font-semibold',
                      slaOk ? 'text-green-400' : slaClose ? 'text-yellow-400' : 'text-red-400'
                    )}
                  >
                    {sla.toFixed(2)}%
                  </td>
                  <td className="px-4 py-2.5 text-gray-300">
                    {(row.projectedAbandonPct ?? 0).toFixed(2)}%
                  </td>
                  <td className="px-4 py-2.5 text-gray-300">
                    {(row.avgOccupancyPct ?? 0).toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // LA mode
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-900">
          <tr>
            {[
              'Day',
              'Req. Hours',
              'Sched. Hours',
              'Surplus',
              'Utilisation%',
              'Meets 105%',
              'Deficit Intervals',
              'Peak Deficit',
              'Peak Surplus',
            ].map((h) => (
              <th
                key={h}
                className="px-3 py-3 text-left font-medium text-gray-400 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {projectionRows.map((row, idx) => {
            const isTotal = row.day === 'TOTAL';
            const surplus = row.surplus ?? 0;
            const util = row.utilisationPct ?? 0;

            return (
              <tr
                key={row.day}
                className={cn(
                  'hover:bg-gray-800/30 transition-colors',
                  isTotal
                    ? 'bg-brand-900/20 border-t-2 border-brand-700'
                    : idx % 2 === 0
                    ? 'bg-gray-950'
                    : 'bg-gray-900/40'
                )}
              >
                <td
                  className={cn(
                    'px-3 py-2.5 font-semibold',
                    isTotal ? 'text-brand-400' : 'text-gray-200'
                  )}
                >
                  {row.day}
                </td>
                <td className="px-3 py-2.5 text-gray-300">
                  {(row.requiredHours ?? 0).toFixed(1)}h
                </td>
                <td className="px-3 py-2.5 text-gray-300">
                  {(row.scheduledHours ?? 0).toFixed(1)}h
                </td>
                <td
                  className={cn(
                    'px-3 py-2.5 font-medium',
                    surplus > 0
                      ? 'text-green-400'
                      : surplus < 0
                      ? 'text-red-400'
                      : 'text-gray-400'
                  )}
                >
                  {surplus >= 0 ? '+' : ''}{surplus.toFixed(1)}h
                </td>
                <td
                  className={cn(
                    'px-3 py-2.5 font-medium',
                    util >= 100 && util <= 105
                      ? 'text-green-400'
                      : util > 105
                      ? 'text-yellow-400'
                      : 'text-red-400'
                  )}
                >
                  {util.toFixed(1)}%
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      row.meetsTarget === 'Yes'
                        ? 'bg-green-900/40 text-green-300'
                        : 'bg-red-900/40 text-red-300'
                    )}
                  >
                    {row.meetsTarget ?? '—'}
                  </span>
                </td>
                <td
                  className={cn(
                    'px-3 py-2.5',
                    (row.deficitIntervals ?? 0) > 0 ? 'text-red-400' : 'text-green-400'
                  )}
                >
                  {row.deficitIntervals ?? 0}
                </td>
                <td className="px-3 py-2.5 text-gray-300">
                  {(row.peakDeficit ?? 0) > 0 ? `-${(row.peakDeficit ?? 0).toFixed(1)}` : '—'}
                </td>
                <td className="px-3 py-2.5 text-gray-300">
                  {(row.peakSurplus ?? 0) > 0 ? `+${(row.peakSurplus ?? 0).toFixed(1)}` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
